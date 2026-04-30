from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import DateTime, Index, Integer, MetaData, String, Text, UniqueConstraint, text as sql_text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.config import get_settings

SETTINGS = get_settings()
DB_SCHEMA = "flirto" if SETTINGS.resolved_database_url.startswith("postgresql") else None
POSTGRES_UUID_DEFAULT = sql_text("gen_random_uuid()::text") if DB_SCHEMA else None
POSTGRES_NOW_DEFAULT = sql_text("now()") if DB_SCHEMA else None


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    metadata = MetaData(schema=DB_SCHEMA)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), index=True)
    brand: Mapped[str | None] = mapped_column(String(64), nullable=True)
    landing_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    entry_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entry_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    clickid: Mapped[str] = mapped_column(String(128), default="")
    telegram_chat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mode: Mapped[str] = mapped_column(String(32))
    plan: Mapped[str] = mapped_column(String(64))
    promo_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
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


class PromoOffer(Base):
    __tablename__ = "promo_offers"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        server_default=POSTGRES_UUID_DEFAULT,
    )
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    currency: Mapped[str] = mapped_column(String(16), default="usd")
    sub_weekly_amount_minor: Mapped[int] = mapped_column(Integer)
    sub_monthly_amount_minor: Mapped[int] = mapped_column(Integer)
    sub_yearly_amount_minor: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        server_default=POSTGRES_NOW_DEFAULT,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        server_default=POSTGRES_NOW_DEFAULT,
    )


class PaymentEvent(Base):
    __tablename__ = "payment_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stripe_event_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(128))
    payload_json: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"))
    process_result: Mapped[str] = mapped_column(String(32), default="processed")
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class MobiSlonRequestLog(Base):
    __tablename__ = "mobi_slon_request_logs"
    __table_args__ = (
        Index("ix_mobi_slon_request_logs_request_id", "request_id"),
        Index("ix_mobi_slon_request_logs_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    transport: Mapped[str] = mapped_column(String(32), default="post")
    incoming_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    clickid: Mapped[str | None] = mapped_column(String(256), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    page_path: Mapped[str | None] = mapped_column(Text(), nullable=True)
    tracking_params: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    request_headers: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    raw_body: Mapped[str | None] = mapped_column(Text(), nullable=True)
    validation_errors: Mapped[dict | list] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=list)
    accepted: Mapped[bool | None] = mapped_column(nullable=True)
    forwarded: Mapped[bool | None] = mapped_column(nullable=True)
    upstream_url: Mapped[str | None] = mapped_column(Text(), nullable=True)
    upstream_params: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    upstream_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    upstream_response_body: Mapped[str | None] = mapped_column(Text(), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    error_class: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class HttpRequestLog(Base):
    __tablename__ = "http_request_logs"
    __table_args__ = (
        Index("ix_http_request_logs_request_id", "request_id"),
        Index("ix_http_request_logs_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id: Mapped[str] = mapped_column(String(64))
    method: Mapped[str] = mapped_column(String(16))
    path: Mapped[str] = mapped_column(String(512))
    query_string: Mapped[str | None] = mapped_column(Text(), nullable=True)
    status_code: Mapped[int] = mapped_column(Integer)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    client_ip: Mapped[str | None] = mapped_column(String(128), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text(), nullable=True)
    request_headers: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    request_body: Mapped[str | None] = mapped_column(Text(), nullable=True)
    response_headers: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    response_body: Mapped[str | None] = mapped_column(Text(), nullable=True)
    error_class: Mapped[str | None] = mapped_column(String(128), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


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


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    locale: Mapped[str] = mapped_column(String(8), default="ru")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AppEmailCode(Base):
    __tablename__ = "app_email_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), index=True)
    purpose: Mapped[str] = mapped_column(String(32), default="login")
    code_hash: Mapped[str] = mapped_column(String(128), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=5)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AppRefreshSession(Base):
    __tablename__ = "app_refresh_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    user_agent: Mapped[str | None] = mapped_column(Text(), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ManualAccessGrant(Base):
    __tablename__ = "manual_access_grants"
    __table_args__ = (
        Index("ix_manual_access_grants_email_status", "email", "status"),
        Index("ix_manual_access_grants_expires_at", "expires_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), index=True)
    status: Mapped[str] = mapped_column(String(32), default="active")
    granted_by_telegram_user_id: Mapped[str] = mapped_column(String(64))
    granted_by_telegram_username: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_telegram_user_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    revoke_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


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


class BotSession(Base):
    __tablename__ = "bot_sessions"
    __table_args__ = (
        Index("ix_bot_sessions_user_status", "telegram_user_id", "status"),
        Index("ix_bot_sessions_owner_status", "owner_kind", "owner_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    telegram_user_id: Mapped[str] = mapped_column(String(64), index=True)
    owner_kind: Mapped[str | None] = mapped_column(String(32), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mode: Mapped[str] = mapped_column(String(32))
    state: Mapped[str] = mapped_column(String(64), default="collecting_context")
    status: Mapped[str] = mapped_column(String(32), default="active")
    current_batch_no: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class BotContextAsset(Base):
    __tablename__ = "bot_context_assets"
    __table_args__ = (
        Index("ix_bot_context_assets_session_batch_created", "session_id", "batch_no", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    batch_no: Mapped[int] = mapped_column(Integer, default=1)
    asset_type: Mapped[str] = mapped_column(String(32))
    source_kind: Mapped[str] = mapped_column(String(32), default="text")
    telegram_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    extracted_text: Mapped[str] = mapped_column(Text, default="")
    parse_confidence: Mapped[float] = mapped_column(nullable=False, default=1.0)
    needs_confirmation: Mapped[bool] = mapped_column(nullable=False, default=False)
    role_ambiguity: Mapped[bool] = mapped_column(nullable=False, default=False)
    summary_for_user: Mapped[str] = mapped_column(Text, default="")
    extraction_meta: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class BotGenerationRun(Base):
    __tablename__ = "bot_generation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    request_payload: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    response_payload: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    llm_provider: Mapped[str] = mapped_column(String(32), default="openai")
    model_name: Mapped[str] = mapped_column(String(128), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    __table_args__ = (
        Index("ix_quiz_sessions_clickid", "clickid"),
        Index("ix_quiz_sessions_created_at", "created_at"),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        server_default=POSTGRES_UUID_DEFAULT,
    )
    locale: Mapped[str] = mapped_column(String(8), default="en")
    currency: Mapped[str] = mapped_column(String(16), default="usd")
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(64), nullable=True)
    landing_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    entry_host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entry_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    clickid: Mapped[str] = mapped_column(String(128), default="")
    tracking_params: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    answers: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), default=dict)
    checkout_state: Mapped[str] = mapped_column(String(32), default="created")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        server_default=POSTGRES_NOW_DEFAULT,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        server_default=POSTGRES_NOW_DEFAULT,
    )
