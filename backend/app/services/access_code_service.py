from __future__ import annotations

from datetime import datetime, timedelta, timezone
import secrets
import string

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.models.payment import AccessCode, AccessCodeRedemption, utcnow

ACCESS_CODE_ALPHABET = string.ascii_uppercase + string.digits
ACCESS_CODE_LENGTH = 10
ACCESS_CODE_PREFIX = "FG"
DEFAULT_ACCESS_CODE_TTL = timedelta(days=7)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class AccessCodeService:
    def __init__(self, db: Session) -> None:
        self.db = db

    @staticmethod
    def normalize_code(raw_code: str) -> str:
        value = (raw_code or "").strip().upper()
        if not value or len(value) > 64:
            raise HTTPException(status_code=400, detail="Invalid promo code")
        allowed = set(string.ascii_uppercase + string.digits + "_-")
        if any(char not in allowed for char in value):
            raise HTTPException(status_code=400, detail="Invalid promo code")
        return value

    def _next_unique_code(self) -> str:
        for _ in range(20):
            suffix = "".join(secrets.choice(ACCESS_CODE_ALPHABET) for _ in range(ACCESS_CODE_LENGTH))
            code = f"{ACCESS_CODE_PREFIX}-{suffix}"
            existing = self.db.scalar(select(AccessCode).where(AccessCode.code == code))
            if existing is None:
                return code
        raise RuntimeError("Unable to generate unique access code")

    def create_code(
        self,
        *,
        admin_telegram_user_id: str,
        admin_telegram_username: str | None,
        expires_at: datetime | None = None,
    ) -> AccessCode:
        normalized_expires_at = _ensure_utc(expires_at) if expires_at is not None else utcnow() + DEFAULT_ACCESS_CODE_TTL
        if normalized_expires_at <= utcnow():
            raise HTTPException(status_code=400, detail="Promo code expiry must be in the future")

        access_code = AccessCode(
            code=self._next_unique_code(),
            is_active=True,
            expires_at=normalized_expires_at,
            max_redemptions=1,
            redeemed_count=0,
            created_by_telegram_user_id=admin_telegram_user_id,
            created_by_telegram_username=admin_telegram_username,
        )
        self.db.add(access_code)
        self.db.commit()
        self.db.refresh(access_code)
        return access_code

    def _mark_expired_redemptions(self, *, email: str | None = None) -> None:
        query = select(AccessCodeRedemption).where(AccessCodeRedemption.status == "active")
        if email is not None:
            query = query.where(AccessCodeRedemption.email == email)
        changed = False
        now = utcnow()
        for redemption in self.db.scalars(query).all():
            if _ensure_utc(redemption.expires_at) < now:
                redemption.status = "expired"
                changed = True
        if changed:
            self.db.flush()

    def redeem_code(self, *, email: str, code: str) -> AccessCodeRedemption:
        normalized_email = normalize_email(email)
        normalized_code = self.normalize_code(code)
        self._mark_expired_redemptions(email=normalized_email)

        access_code = self.db.scalar(select(AccessCode).where(AccessCode.code == normalized_code))
        if access_code is None:
            raise HTTPException(status_code=400, detail="Promo code is invalid")
        if not access_code.is_active:
            raise HTTPException(status_code=400, detail="Promo code is inactive")
        if _ensure_utc(access_code.expires_at) < utcnow():
            access_code.is_active = False
            self.db.commit()
            raise HTTPException(status_code=400, detail="Promo code has expired")

        existing = self.db.scalar(
            select(AccessCodeRedemption).where(
                AccessCodeRedemption.access_code_id == access_code.id,
                AccessCodeRedemption.email == normalized_email,
            )
        )
        if existing is not None:
            if existing.status == "active" and _ensure_utc(existing.expires_at) >= utcnow():
                return existing
            raise HTTPException(status_code=409, detail="Promo code was already redeemed")

        if access_code.redeemed_count >= access_code.max_redemptions:
            raise HTTPException(status_code=409, detail="Promo code redemption limit reached")

        redemption = AccessCodeRedemption(
            access_code_id=access_code.id,
            email=normalized_email,
            status="active",
            expires_at=access_code.expires_at,
        )
        access_code.redeemed_count += 1
        self.db.add(redemption)
        self.db.commit()
        self.db.refresh(redemption)
        return redemption
