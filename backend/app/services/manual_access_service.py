from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.models.payment import ManualAccessGrant, utcnow


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(frozen=True)
class ManualGrantAdminMeta:
    telegram_user_id: str
    telegram_username: str | None = None


class ManualAccessService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _mark_expired_active_grants(self, *, email: str | None = None) -> None:
        query = select(ManualAccessGrant).where(ManualAccessGrant.status == "active")
        if email is not None:
            query = query.where(ManualAccessGrant.email == normalize_email(email))
        changed = False
        for grant in self.db.scalars(query).all():
            if _ensure_utc(grant.expires_at) < utcnow():
                grant.status = "expired"
                changed = True
        if changed:
            self.db.flush()

    def get_manual_grant(self, email: str) -> ManualAccessGrant | None:
        normalized_email = normalize_email(email)
        self._mark_expired_active_grants(email=normalized_email)
        return self.db.scalar(
            select(ManualAccessGrant)
            .where(ManualAccessGrant.email == normalized_email)
            .order_by(desc(ManualAccessGrant.created_at))
        )

    def get_active_manual_grant(self, email: str) -> ManualAccessGrant | None:
        normalized_email = normalize_email(email)
        self._mark_expired_active_grants(email=normalized_email)
        return self.db.scalar(
            select(ManualAccessGrant)
            .where(
                ManualAccessGrant.email == normalized_email,
                ManualAccessGrant.status == "active",
            )
            .order_by(desc(ManualAccessGrant.created_at))
        )

    def grant_by_email(self, *, email: str, expires_at: datetime, admin_meta: ManualGrantAdminMeta) -> ManualAccessGrant:
        normalized_email = normalize_email(email)
        normalized_expires_at = _ensure_utc(expires_at)
        self._mark_expired_active_grants(email=normalized_email)

        existing_active = self.db.scalars(
            select(ManualAccessGrant).where(
                ManualAccessGrant.email == normalized_email,
                ManualAccessGrant.status == "active",
            )
        ).all()
        now = utcnow()
        for grant in existing_active:
            grant.status = "revoked"
            grant.revoked_at = now
            grant.revoked_by_telegram_user_id = admin_meta.telegram_user_id
            grant.revoke_reason = "replaced_by_new_grant"

        new_grant = ManualAccessGrant(
            email=normalized_email,
            status="active",
            granted_by_telegram_user_id=admin_meta.telegram_user_id,
            granted_by_telegram_username=admin_meta.telegram_username,
            expires_at=normalized_expires_at,
        )
        self.db.add(new_grant)
        self.db.commit()
        self.db.refresh(new_grant)
        return new_grant

    def revoke_by_email(
        self,
        *,
        email: str,
        admin_meta: ManualGrantAdminMeta,
        reason: str = "admin_revoke",
    ) -> ManualAccessGrant | None:
        normalized_email = normalize_email(email)
        self._mark_expired_active_grants(email=normalized_email)
        grant = self.db.scalar(
            select(ManualAccessGrant)
            .where(
                ManualAccessGrant.email == normalized_email,
                ManualAccessGrant.status == "active",
            )
            .order_by(desc(ManualAccessGrant.created_at))
        )
        if grant is None:
            self.db.commit()
            return None

        grant.status = "revoked"
        grant.revoked_at = utcnow()
        grant.revoked_by_telegram_user_id = admin_meta.telegram_user_id
        grant.revoke_reason = reason
        self.db.commit()
        self.db.refresh(grant)
        return grant
