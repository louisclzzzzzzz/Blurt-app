"""initial schema

Écrite à la main (pas d'autogenerate) car aucune base Postgres n'est encore
connectée à ce stade du projet. Reflète exactement les modèles SQLModel de
app/models/. Si vous régénérez plus tard via `alembic revision --autogenerate`
contre une base déjà à jour, ce fichier ne devrait produire aucun diff.

Revision ID: 0001
Revises:
Create Date: 2026-07-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 1024


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # --- food_items / food_aliases ---------------------------------------
    op.create_table(
        "food_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("is_packaged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("ciqual_code", sa.String(), nullable=True),
        sa.Column("off_barcode", sa.String(), nullable=True),
        sa.Column("energy_kcal", sa.Float(), nullable=False),
        sa.Column("protein_g", sa.Float(), nullable=False),
        sa.Column("carbs_g", sa.Float(), nullable=False),
        sa.Column("fat_g", sa.Float(), nullable=False),
        sa.Column("saturated_fat_g", sa.Float(), nullable=True),
        sa.Column("sugars_g", sa.Float(), nullable=True),
        sa.Column("fiber_g", sa.Float(), nullable=True),
        sa.Column("salt_g", sa.Float(), nullable=True),
        sa.Column("default_portion_label", sa.String(), nullable=True),
        sa.Column("default_portion_grams", sa.Float(), nullable=True),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
    )
    op.create_index("ix_food_items_name", "food_items", ["name"])
    op.create_index("ix_food_items_ciqual_code", "food_items", ["ciqual_code"])
    op.create_index("ix_food_items_off_barcode", "food_items", ["off_barcode"])
    op.execute("CREATE INDEX ix_food_items_name_trgm ON food_items USING gin (name gin_trgm_ops)")

    op.create_table(
        "food_aliases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "food_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("food_items.id"),
            nullable=False,
        ),
        sa.Column("alias_text", sa.String(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
    )
    op.create_index("ix_food_aliases_food_item_id", "food_aliases", ["food_item_id"])
    op.create_index("ix_food_aliases_alias_text", "food_aliases", ["alias_text"])
    op.execute(
        "CREATE INDEX ix_food_aliases_alias_text_trgm ON food_aliases USING gin (alias_text gin_trgm_ops)"
    )

    # --- strength_exercises / exercise_aliases ----------------------------
    op.create_table(
        "strength_exercises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("equipment", sa.String(), nullable=True),
        sa.Column("muscle_group", sa.String(), nullable=True),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
    )
    op.create_index("ix_strength_exercises_name", "strength_exercises", ["name"])
    op.execute(
        "CREATE INDEX ix_strength_exercises_name_trgm ON strength_exercises USING gin (name gin_trgm_ops)"
    )

    op.create_table(
        "exercise_aliases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "exercise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("strength_exercises.id"),
            nullable=False,
        ),
        sa.Column("alias_text", sa.String(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
    )
    op.create_index("ix_exercise_aliases_exercise_id", "exercise_aliases", ["exercise_id"])
    op.create_index("ix_exercise_aliases_alias_text", "exercise_aliases", ["alias_text"])
    op.execute(
        "CREATE INDEX ix_exercise_aliases_alias_text_trgm ON exercise_aliases USING gin (alias_text gin_trgm_ops)"
    )

    # --- activity_types / activity_aliases / activity_logs ----------------
    op.create_table(
        "activity_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
    )
    op.create_index("ix_activity_types_name", "activity_types", ["name"])
    op.execute(
        "CREATE INDEX ix_activity_types_name_trgm ON activity_types USING gin (name gin_trgm_ops)"
    )

    op.create_table(
        "activity_aliases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "activity_type_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("activity_types.id"),
            nullable=False,
        ),
        sa.Column("alias_text", sa.String(), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
    )
    op.create_index("ix_activity_aliases_activity_type_id", "activity_aliases", ["activity_type_id"])
    op.create_index("ix_activity_aliases_alias_text", "activity_aliases", ["alias_text"])
    op.execute(
        "CREATE INDEX ix_activity_aliases_alias_text_trgm ON activity_aliases USING gin (alias_text gin_trgm_ops)"
    )

    op.create_table(
        "activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "activity_type_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("activity_types.id"),
            nullable=False,
        ),
        sa.Column("duration_minutes", sa.Float(), nullable=True),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_activity_logs_activity_type_id", "activity_logs", ["activity_type_id"])

    # --- workout_sessions / strength_sets ----------------------------------
    op.create_table(
        "workout_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
    )

    op.create_table(
        "strength_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "workout_session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workout_sessions.id"),
            nullable=False,
        ),
        sa.Column(
            "exercise_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("strength_exercises.id"),
            nullable=False,
        ),
        sa.Column("set_number", sa.Integer(), nullable=False),
        sa.Column("reps", sa.Integer(), nullable=True),
        sa.Column("weight_kg", sa.Float(), nullable=True),
        sa.Column("rpe", sa.Float(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_strength_sets_workout_session_id", "strength_sets", ["workout_session_id"])
    op.create_index("ix_strength_sets_exercise_id", "strength_sets", ["exercise_id"])

    # --- meal_entries / food_consumptions ----------------------------------
    op.create_table(
        "meal_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("logged_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("meal_type", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
    )

    op.create_table(
        "food_consumptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "meal_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("meal_entries.id"),
            nullable=False,
        ),
        sa.Column(
            "food_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("food_items.id"),
            nullable=False,
        ),
        sa.Column("quantity_grams", sa.Float(), nullable=False),
        sa.Column("energy_kcal", sa.Float(), nullable=False),
        sa.Column("protein_g", sa.Float(), nullable=False),
        sa.Column("carbs_g", sa.Float(), nullable=False),
        sa.Column("fat_g", sa.Float(), nullable=False),
    )
    op.create_index("ix_food_consumptions_meal_entry_id", "food_consumptions", ["meal_entry_id"])
    op.create_index("ix_food_consumptions_food_item_id", "food_consumptions", ["food_item_id"])

    # --- voice_captures ------------------------------------------------------
    op.create_table(
        "voice_captures",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("audio_url", sa.String(), nullable=False),
        sa.Column("transcript_text", sa.String(), nullable=True),
        sa.Column("raw_extraction", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("validated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("voice_captures")
    op.drop_table("food_consumptions")
    op.drop_table("meal_entries")
    op.drop_table("strength_sets")
    op.drop_table("workout_sessions")
    op.drop_table("activity_logs")
    op.drop_table("activity_aliases")
    op.drop_table("activity_types")
    op.drop_table("exercise_aliases")
    op.drop_table("strength_exercises")
    op.drop_table("food_aliases")
    op.drop_table("food_items")
