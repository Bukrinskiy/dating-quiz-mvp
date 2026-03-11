"""rename promo quarterly column to yearly

Revision ID: 9f2b8f7e5a1c
Revises: 657dcb459b3d
Create Date: 2026-03-11 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9f2b8f7e5a1c"
down_revision: Union[str, Sequence[str], None] = "657dcb459b3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PROMO_TABLE = "promo_offers"
SCHEMA = "seranking"


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table(PROMO_TABLE, schema=SCHEMA) as batch_op:
        batch_op.alter_column("sub_quarterly_amount_minor", new_column_name="sub_yearly_amount_minor")


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table(PROMO_TABLE, schema=SCHEMA) as batch_op:
        batch_op.alter_column("sub_yearly_amount_minor", new_column_name="sub_quarterly_amount_minor")
