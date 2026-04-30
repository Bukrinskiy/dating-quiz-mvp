"""app auth and owner sessions

Revision ID: 2026_04_14_1200
Revises: ab442adc716d
Create Date: 2026-04-14 12:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2026_04_14_1200"
down_revision: Union[str, Sequence[str], None] = "ab442adc716d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "app_users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("locale", sa.String(length=8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        schema="flirto",
    )
    op.create_index(op.f("ix_flirto_app_users_email"), "app_users", ["email"], unique=False, schema="flirto")

    op.create_table(
        "app_email_codes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("code_hash", sa.String(length=128), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="flirto",
    )
    op.create_index(op.f("ix_flirto_app_email_codes_email"), "app_email_codes", ["email"], unique=False, schema="flirto")
    op.create_index(op.f("ix_flirto_app_email_codes_code_hash"), "app_email_codes", ["code_hash"], unique=False, schema="flirto")

    op.create_table(
        "app_refresh_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=128), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("refresh_token_hash"),
        schema="flirto",
    )
    op.create_index(op.f("ix_flirto_app_refresh_sessions_user_id"), "app_refresh_sessions", ["user_id"], unique=False, schema="flirto")
    op.create_index(
        op.f("ix_flirto_app_refresh_sessions_refresh_token_hash"),
        "app_refresh_sessions",
        ["refresh_token_hash"],
        unique=False,
        schema="flirto",
    )

    op.add_column("bot_sessions", sa.Column("owner_kind", sa.String(length=32), nullable=True), schema="flirto")
    op.add_column("bot_sessions", sa.Column("owner_id", sa.String(length=64), nullable=True), schema="flirto")
    op.create_index("ix_bot_sessions_owner_status", "bot_sessions", ["owner_kind", "owner_id", "status"], unique=False, schema="flirto")
    op.execute(
        """
        UPDATE flirto.bot_sessions
        SET owner_kind = 'telegram', owner_id = telegram_user_id
        WHERE owner_kind IS NULL AND telegram_user_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_bot_sessions_owner_status", table_name="bot_sessions", schema="flirto")
    op.drop_column("bot_sessions", "owner_id", schema="flirto")
    op.drop_column("bot_sessions", "owner_kind", schema="flirto")

    op.drop_index(op.f("ix_flirto_app_refresh_sessions_refresh_token_hash"), table_name="app_refresh_sessions", schema="flirto")
    op.drop_index(op.f("ix_flirto_app_refresh_sessions_user_id"), table_name="app_refresh_sessions", schema="flirto")
    op.drop_table("app_refresh_sessions", schema="flirto")

    op.drop_index(op.f("ix_flirto_app_email_codes_code_hash"), table_name="app_email_codes", schema="flirto")
    op.drop_index(op.f("ix_flirto_app_email_codes_email"), table_name="app_email_codes", schema="flirto")
    op.drop_table("app_email_codes", schema="flirto")

    op.drop_index(op.f("ix_flirto_app_users_email"), table_name="app_users", schema="flirto")
    op.drop_table("app_users", schema="flirto")
