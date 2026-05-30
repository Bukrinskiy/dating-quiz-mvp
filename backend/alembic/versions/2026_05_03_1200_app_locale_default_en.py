"""app locale default en

Revision ID: 2026_05_03_1200
Revises: 2026_04_20_1200
Create Date: 2026-05-03 12:00:00.000000
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "2026_05_03_1200"
down_revision: Union[str, Sequence[str], None] = "2026_04_20_1200"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    table_name = "app_users" if op.get_bind().dialect.name == "sqlite" else "flirto.app_users"
    op.execute(f"UPDATE {table_name} SET locale = 'en'")


def downgrade() -> None:
    pass
