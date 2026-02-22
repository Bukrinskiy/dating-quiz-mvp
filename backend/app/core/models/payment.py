from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, Integer, MetaData, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import JSON



from app.core.config import get_settings

SETTINGS = get_settings()
DB_SCHEMA = "seranking" if SETTINGS.resolved_database_url.startswith("postgresql") else None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    metadata = MetaData(schema=DB_SCHEMA)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), index=True)
    clickid: Mapped[str] = mapped_column(String(128), default="")
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mode: Mapped[str] = mapped_column(String(32))
    plan: Mapped[str] = mapped_column(String(64))
    locale: Mapped[str] = mapped_column(String(8), default="en")
    amount_minor: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(32), default="created")
    fulfillment_status: Mapped[str] = mapped_column(String(32), default="pending")
    access_status: Mapped[str] = mapped_column(String(32), default="pending")
    stripe_session_id: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stripe_event_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(128))
    payload_json: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"))
    process_result: Mapped[str] = mapped_column(String(32), default="processed")
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AccessToken(Base):
    __tablename__ = "access_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(String(36), index=True)
    status: Mapped[str] = mapped_column(String(32), default="issued")
    revoked_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AccessBinding(Base):
    __tablename__ = "access_bindings"
    __table_args__ = (UniqueConstraint("order_id", "telegram_user_id", name="uq_access_order_telegram"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id: Mapped[str] = mapped_column(String(36), index=True)
    telegram_user_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    bound_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RestoreOTP(Base):
    __tablename__ = "restore_otps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), index=True)
    otp_hash: Mapped[str] = mapped_column(String(128), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=5)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
