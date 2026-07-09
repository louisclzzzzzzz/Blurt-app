"""target_muscles on strength_exercises

Remplace le champ libre muscle_group (jamais fiable pour agréger un volume
par muscle) par target_muscles, un tableau de valeurs contrôlées
(app.models.enums.MuscleGroup) — permet le nouvel onglet muscu (volume
hebdomadaire par groupe musculaire).

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "strength_exercises",
        sa.Column(
            "target_muscles",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.drop_column("strength_exercises", "muscle_group")


def downgrade() -> None:
    op.add_column("strength_exercises", sa.Column("muscle_group", sa.String(), nullable=True))
    op.drop_column("strength_exercises", "target_muscles")
