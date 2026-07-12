import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from app.models.base import BaseTable, utcnow
from app.models.enums import DraftItemStatus


class CaptureDraftItem(BaseTable, table=True):
    """Brouillon d'un aliment pendant une dictée live (pilote, cf.
    DICTEE_LIVE_NUTRITION.md) : une ligne par item actif ou retiré, construite
    au fur et à mesure par les opérations add/modify/remove extraites de
    chaque segment de transcription. Devient obsolète après validation
    (POST /captures/{id}/validate), comme raw_extraction pour le flux batch.
    """

    __tablename__ = "capture_draft_items"

    capture_id: uuid.UUID = Field(foreign_key="voice_captures.id", index=True)

    spoken_name: str
    quantity_grams: Optional[float] = None
    quantity_units: Optional[float] = None
    quantity_description: Optional[str] = None
    is_packaged_product: bool = False
    dictated_macros: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))

    # Renseignés à partir de la Phase 7C (matching) — vides tant que seule
    # l'extraction (7B) est câblée.
    match_confidence: Optional[str] = None
    candidates: Optional[list[dict[str, Any]]] = Field(default=None, sa_column=Column(JSONB))

    status: DraftItemStatus = Field(
        default=DraftItemStatus.ACTIVE, sa_column=Column(String, nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
