"""access codes replace manual grants

Revision ID: 2026_05_04_1500
Revises: 2026_05_03_1200
Create Date: 2026-05-04 15:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2026_05_04_1500"
down_revision: Union[str, Sequence[str], None] = "2026_05_03_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"
    schema = None if is_sqlite else "flirto"

    op.create_table(
        "access_codes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_redemptions", sa.Integer(), nullable=False),
        sa.Column("redeemed_count", sa.Integer(), nullable=False),
        sa.Column("created_by_telegram_user_id", sa.String(length=64), nullable=False),
        sa.Column("created_by_telegram_username", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        schema=schema,
    )
    op.create_index(op.f("ix_flirto_access_codes_code"), "access_codes", ["code"], unique=True, schema=schema)

    op.create_table(
        "access_code_redemptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("access_code_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("access_code_id", "email", name="uq_access_code_redemption_email"),
        schema=schema,
    )
    op.create_index(op.f("ix_flirto_access_code_redemptions_access_code_id"), "access_code_redemptions", ["access_code_id"], unique=False, schema=schema)
    op.create_index(op.f("ix_flirto_access_code_redemptions_email"), "access_code_redemptions", ["email"], unique=False, schema=schema)
    op.create_index("ix_access_code_redemptions_email_status", "access_code_redemptions", ["email", "status"], unique=False, schema=schema)
    op.create_index("ix_access_code_redemptions_expires_at", "access_code_redemptions", ["expires_at"], unique=False, schema=schema)

    manual_table = "manual_access_grants" if is_sqlite else "flirto.manual_access_grants"
    now_sql = "CURRENT_TIMESTAMP" if is_sqlite else "now()"
    op.execute(
        f"""
        UPDATE {manual_table}
        SET status = 'revoked',
            revoked_at = {now_sql},
            revoke_reason = 'manual_access_removed'
        WHERE status = 'active'
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    schema = None if bind.dialect.name == "sqlite" else "flirto"
    op.drop_index("ix_access_code_redemptions_expires_at", table_name="access_code_redemptions", schema=schema)
    op.drop_index("ix_access_code_redemptions_email_status", table_name="access_code_redemptions", schema=schema)
    op.drop_index(op.f("ix_flirto_access_code_redemptions_email"), table_name="access_code_redemptions", schema=schema)
    op.drop_index(op.f("ix_flirto_access_code_redemptions_access_code_id"), table_name="access_code_redemptions", schema=schema)
    op.drop_table("access_code_redemptions", schema=schema)
    op.drop_index(op.f("ix_flirto_access_codes_code"), table_name="access_codes", schema=schema)
    op.drop_table("access_codes", schema=schema)
