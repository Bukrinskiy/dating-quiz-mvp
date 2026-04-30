"""manual access grants

Revision ID: 2026_04_20_1200
Revises: 2026_04_14_1200
Create Date: 2026-04-20 12:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2026_04_20_1200"
down_revision: Union[str, Sequence[str], None] = "2026_04_14_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "manual_access_grants",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("granted_by_telegram_user_id", sa.String(length=64), nullable=False),
        sa.Column("granted_by_telegram_username", sa.String(length=128), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_telegram_user_id", sa.String(length=64), nullable=True),
        sa.Column("revoke_reason", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema="flirto",
    )
    op.create_index(
        op.f("ix_flirto_manual_access_grants_email"),
        "manual_access_grants",
        ["email"],
        unique=False,
        schema="flirto",
    )
    op.create_index(
        "ix_manual_access_grants_email_status",
        "manual_access_grants",
        ["email", "status"],
        unique=False,
        schema="flirto",
    )
    op.create_index(
        "ix_manual_access_grants_expires_at",
        "manual_access_grants",
        ["expires_at"],
        unique=False,
        schema="flirto",
    )


def downgrade() -> None:
    op.drop_index("ix_manual_access_grants_expires_at", table_name="manual_access_grants", schema="flirto")
    op.drop_index("ix_manual_access_grants_email_status", table_name="manual_access_grants", schema="flirto")
    op.drop_index(op.f("ix_flirto_manual_access_grants_email"), table_name="manual_access_grants", schema="flirto")
    op.drop_table("manual_access_grants", schema="flirto")
