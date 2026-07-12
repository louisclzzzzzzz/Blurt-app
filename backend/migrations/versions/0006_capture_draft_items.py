"""capture_draft_items

Table de brouillon pour le pilote dictée live nutrition (cf.
DICTEE_LIVE_NUTRITION.md, Phase 7B) : un item par aliment actif ou retiré
pendant une session de dictée en flux continu, construit au fur et à mesure
par les opérations add/modify/remove extraites de chaque segment.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "capture_draft_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "capture_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("voice_captures.id"),
            nullable=False,
        ),
        sa.Column("spoken_name", sa.String(), nullable=False),
        sa.Column("quantity_grams", sa.Float(), nullable=True),
        sa.Column("quantity_units", sa.Float(), nullable=True),
        sa.Column("quantity_description", sa.String(), nullable=True),
        sa.Column("is_packaged_product", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("dictated_macros", postgresql.JSONB(), nullable=True),
        sa.Column("match_confidence", sa.String(), nullable=True),
        sa.Column("candidates", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
    )
    op.create_index("ix_capture_draft_items_capture_id", "capture_draft_items", ["capture_id"])


def downgrade() -> None:
    op.drop_index("ix_capture_draft_items_capture_id", table_name="capture_draft_items")
    op.drop_table("capture_draft_items")
