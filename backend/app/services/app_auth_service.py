from __future__ import annotations

import secrets
from datetime import timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.models.payment import AppEmailCode, AppRefreshSession, AppUser, utcnow
from app.core.notifications import LogOnlyEmailSender, SmtpEmailSender
from app.core.security import generate_otp, hash_value, make_signed_token, parse_signed_token
from app.services.entitlement_service import EntitlementService


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _ensure_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class AppEntitlementService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def resolve_by_email(self, email: str) -> dict[str, str | bool | None]:
        return EntitlementService(self.db).resolve_payload_by_email(email)


class AppAuthService:
    def __init__(self, settings: Settings, db: Session) -> None:
        self.settings = settings
        self.db = db
        from app.core.notifications import build_email_sender

        self.email_sender: LogOnlyEmailSender | SmtpEmailSender = build_email_sender(settings)
        self.entitlements = AppEntitlementService(db)

    def _build_access_token(self, user: AppUser) -> str:
        expires_at = utcnow() + timedelta(seconds=self.settings.app_auth_access_ttl_seconds)
        return make_signed_token(
            {
                "type": "app_access",
                "sub": user.id,
                "email": user.email,
                "locale": user.locale,
                "exp": int(expires_at.timestamp()),
            },
            self.settings.app_auth_secret,
        )

    def _issue_refresh_session(self, *, user: AppUser, request: Request | None) -> tuple[AppRefreshSession, str]:
        raw_token = secrets.token_urlsafe(32)
        session = AppRefreshSession(
            user_id=user.id,
            refresh_token_hash=hash_value(raw_token),
            user_agent=request.headers.get("user-agent") if request is not None else None,
            ip_address=request.client.host if request is not None and request.client is not None else None,
            expires_at=utcnow() + timedelta(seconds=self.settings.app_auth_refresh_ttl_seconds),
        )
        self.db.add(session)
        self.db.flush()
        return session, raw_token

    def _auth_response(self, user: AppUser) -> dict[str, Any]:
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "locale": user.locale,
            },
            "tokens": {
                "access_token": self._build_access_token(user),
                "expires_in": self.settings.app_auth_access_ttl_seconds,
            },
            "access": self.entitlements.resolve_by_email(user.email),
        }

    def request_email_code(self, *, email: str) -> dict[str, str]:
        normalized_email = normalize_email(email)
        code = generate_otp()
        record = AppEmailCode(
            email=normalized_email,
            purpose="login",
            code_hash=hash_value(code),
            attempts=0,
            max_attempts=5,
            expires_at=utcnow() + timedelta(seconds=self.settings.otp_ttl_seconds),
        )
        self.db.add(record)
        self.db.commit()
        self.email_sender.send_app_login_code(
            email=normalized_email,
            code=code,
            allow_plain_code=self.settings.log_otp_in_nonprod,
            locale="ru",
        )
        return {"status": "code_sent"}

    def confirm_email_code(self, *, email: str, code: str, request: Request | None) -> tuple[dict[str, Any], str]:
        normalized_email = normalize_email(email)
        record = self.db.scalar(
            select(AppEmailCode)
            .where(AppEmailCode.email == normalized_email, AppEmailCode.purpose == "login", AppEmailCode.used_at.is_(None))
            .order_by(desc(AppEmailCode.created_at))
        )
        if record is None:
            raise HTTPException(status_code=400, detail="No login code found")
        if _ensure_utc(record.expires_at) < utcnow():
            raise HTTPException(status_code=400, detail="Login code expired")
        if record.attempts >= record.max_attempts:
            raise HTTPException(status_code=400, detail="Login code attempts exceeded")
        if record.code_hash != hash_value(code):
            record.attempts += 1
            self.db.commit()
            raise HTTPException(status_code=400, detail="Invalid login code")
        record.used_at = utcnow()
        user = self.db.scalar(select(AppUser).where(AppUser.email == normalized_email))
        if user is None:
            user = AppUser(email=normalized_email, locale="ru")
            self.db.add(user)
            self.db.flush()
        user.last_login_at = utcnow()
        _, refresh_token = self._issue_refresh_session(user=user, request=request)
        self.db.commit()
        return self._auth_response(user), refresh_token

    def refresh(self, *, refresh_token: str, request: Request | None) -> tuple[dict[str, Any], str]:
        token_hash = hash_value(refresh_token)
        session = self.db.scalar(select(AppRefreshSession).where(AppRefreshSession.refresh_token_hash == token_hash))
        if session is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        now = utcnow()
        if session.revoked_at is not None:
            raise HTTPException(status_code=401, detail="Refresh token revoked")
        if _ensure_utc(session.expires_at) < now:
            raise HTTPException(status_code=401, detail="Refresh token expired")
        if session.rotated_at is not None:
            grace_deadline = _ensure_utc(session.rotated_at) + timedelta(seconds=self.settings.app_auth_refresh_grace_seconds)
            if grace_deadline < now:
                session.revoked_at = now
                self.db.commit()
                raise HTTPException(status_code=401, detail="Refresh token rotated")
        user = self.db.scalar(select(AppUser).where(AppUser.id == session.user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        successor, next_refresh_token = self._issue_refresh_session(user=user, request=request)
        session.rotated_at = now
        session.replaced_by_id = successor.id
        user.last_login_at = now
        self.db.commit()
        return self._auth_response(user), next_refresh_token

    def logout(self, *, refresh_token: str | None) -> None:
        if not refresh_token:
            return
        token_hash = hash_value(refresh_token)
        session = self.db.scalar(select(AppRefreshSession).where(AppRefreshSession.refresh_token_hash == token_hash))
        if session is None:
            return
        session.revoked_at = utcnow()
        self.db.commit()

    def get_current_user(self, access_token: str) -> AppUser:
        payload = parse_signed_token(access_token, self.settings.app_auth_secret)
        if payload is None or payload.get("type") != "app_access":
            raise HTTPException(status_code=401, detail="Invalid access token")
        user_id = str(payload.get("sub") or "").strip()
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid access token")
        user = self.db.scalar(select(AppUser).where(AppUser.id == user_id))
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
