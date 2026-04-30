from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.models.payment import AccessBinding, ManualAccessGrant, Order
from app.core.config import get_plan_map, get_settings
from app.services.manual_access_service import ManualAccessService, normalize_email


@dataclass(frozen=True)
class EmailEntitlement:
    has_access: bool
    order_id: str | None
    plan: str | None
    access_status: str | None
    expires_at: datetime | None
    source: str
    manual_grant: ManualAccessGrant | None = None
    order: Order | None = None


class EntitlementService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.manual_access = ManualAccessService(db)

    def _ensure_utc(self, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    def _fallback_order_expires_at(self, order: Order | None) -> datetime | None:
        if order is None:
            return None

        explicit_period_end = self._ensure_utc(order.stripe_current_period_end)
        if explicit_period_end is not None:
            return explicit_period_end

        plan = get_plan_map(get_settings()).get(order.plan)
        if plan is None or plan.interval is None:
            return None

        base_time = self._ensure_utc(order.updated_at) or self._ensure_utc(order.created_at)
        if base_time is None:
            return None

        interval_count = max(1, int(plan.interval_count or 1))
        if plan.interval == "week":
            return base_time + timedelta(days=7 * interval_count)
        if plan.interval == "month":
            return base_time + timedelta(days=30 * interval_count)
        if plan.interval == "year":
            return base_time + timedelta(days=365 * interval_count)
        return None

    def resolve_by_email(self, email: str) -> EmailEntitlement:
        normalized_email = normalize_email(email)
        manual_grant = self.manual_access.get_active_manual_grant(normalized_email)
        order = self.db.scalar(select(Order).where(Order.email == normalized_email).order_by(desc(Order.updated_at)))
        order_has_access = bool(order and (order.access_status == "active" or order.status in {"paid", "active"}))

        if order_has_access:
            return EmailEntitlement(
                has_access=True,
                order_id=order.id,
                plan=order.plan,
                access_status=order.access_status,
                expires_at=self._fallback_order_expires_at(order),
                source="order",
                manual_grant=manual_grant,
                order=order,
            )

        if manual_grant is not None:
            return EmailEntitlement(
                has_access=True,
                order_id=order.id if order is not None else None,
                plan=order.plan if order is not None else "manual",
                access_status="manual_active",
                expires_at=manual_grant.expires_at,
                source="manual_grant",
                manual_grant=manual_grant,
                order=order,
            )

        if order is not None:
            return EmailEntitlement(
                has_access=False,
                order_id=order.id,
                plan=order.plan,
                access_status=order.access_status,
                expires_at=self._fallback_order_expires_at(order),
                source="order",
                manual_grant=None,
                order=order,
            )

        return EmailEntitlement(
            has_access=False,
            order_id=None,
            plan=None,
            access_status=None,
            expires_at=None,
            source="none",
            manual_grant=None,
            order=None,
        )

    def resolve_payload_by_email(self, email: str) -> dict[str, str | bool | None]:
        entitlement = self.resolve_by_email(email)
        return {
            "has_access": entitlement.has_access,
            "order_id": entitlement.order_id,
            "plan": entitlement.plan,
            "access_status": entitlement.access_status,
            "expires_at": entitlement.expires_at.isoformat() if entitlement.expires_at is not None else None,
        }

    def resolve_bot_access_status(self, telegram_user_id: str) -> dict[str, str | bool | None]:
        active_binding = self.db.scalar(
            select(AccessBinding)
            .where(AccessBinding.telegram_user_id == telegram_user_id, AccessBinding.status == "active")
            .order_by(desc(AccessBinding.bound_at))
        )
        if active_binding is not None:
            order = self.db.scalar(select(Order).where(Order.id == active_binding.order_id))
            if order is not None:
                resolved = self.resolve_by_email(order.email)
                return {
                    "is_paid": resolved.has_access,
                    "order_id": resolved.order_id,
                    "plan": resolved.plan,
                    "access_status": resolved.access_status,
                }

        latest_binding = self.db.scalar(
            select(AccessBinding).where(AccessBinding.telegram_user_id == telegram_user_id).order_by(desc(AccessBinding.bound_at))
        )
        if latest_binding is not None:
            order = self.db.scalar(select(Order).where(Order.id == latest_binding.order_id))
            if order is not None:
                resolved = self.resolve_by_email(order.email)
                return {
                    "is_paid": resolved.has_access,
                    "order_id": resolved.order_id,
                    "plan": resolved.plan,
                    "access_status": resolved.access_status,
                }

        fallback_order = self.db.scalar(
            select(Order).where(Order.telegram_chat_id == telegram_user_id).order_by(desc(Order.updated_at))
        )
        if fallback_order is None:
            return {"is_paid": False, "order_id": None, "plan": None, "access_status": None}

        resolved = self.resolve_by_email(fallback_order.email)
        return {
            "is_paid": resolved.has_access,
            "order_id": resolved.order_id,
            "plan": resolved.plan,
            "access_status": resolved.access_status,
        }
