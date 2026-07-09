"""nutrition goals on user_profiles

Ajoute les objectifs journaliers optionnels (calories, protéines, glucides,
lipides) utilisés par le récap nutrition (anneau calories + barres macros)
dans l'onglet Nutrition de l'historique.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_profiles", sa.Column("calorie_goal_kcal", sa.Float(), nullable=True))
    op.add_column("user_profiles", sa.Column("protein_goal_g", sa.Float(), nullable=True))
    op.add_column("user_profiles", sa.Column("carbs_goal_g", sa.Float(), nullable=True))
    op.add_column("user_profiles", sa.Column("fat_goal_g", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profiles", "fat_goal_g")
    op.drop_column("user_profiles", "carbs_goal_g")
    op.drop_column("user_profiles", "protein_goal_g")
    op.drop_column("user_profiles", "calorie_goal_kcal")
