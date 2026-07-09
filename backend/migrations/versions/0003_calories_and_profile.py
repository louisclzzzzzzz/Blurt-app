"""user profile + MET/calorie tracking

Ajoute la table user_profiles (singleton mono-utilisateur : sexe, date de
naissance, taille, poids) et les colonnes nécessaires au calcul des calories
dépensées : met_value sur strength_exercises/activity_types (estimé par le
LLM à la création de la fiche), calories_kcal sur activity_logs/workout_sessions
(snapshot calculé à l'enregistrement) — cf. app/services/calories.py.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-08
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sex", sa.String(), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("height_cm", sa.Float(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.add_column("strength_exercises", sa.Column("met_value", sa.Float(), nullable=True))
    op.add_column("activity_types", sa.Column("met_value", sa.Float(), nullable=True))
    op.add_column("activity_logs", sa.Column("calories_kcal", sa.Float(), nullable=True))
    op.add_column("workout_sessions", sa.Column("calories_kcal", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("workout_sessions", "calories_kcal")
    op.drop_column("activity_logs", "calories_kcal")
    op.drop_column("activity_types", "met_value")
    op.drop_column("strength_exercises", "met_value")
    op.drop_table("user_profiles")
