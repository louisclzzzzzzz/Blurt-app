"""rename strength_sets.rpe to rir

RPE (Rate of Perceived Exertion) remplacé par RIR (répétitions en réserve),
la métrique demandée par l'utilisateur pour le suivi de musculation.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-08
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("strength_sets", "rpe", new_column_name="rir")


def downgrade() -> None:
    op.alter_column("strength_sets", "rir", new_column_name="rpe")
