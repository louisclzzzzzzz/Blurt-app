from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from app.models.base import BaseTable
from app.models.enums import CaptureStatus


class VoiceCapture(BaseTable, table=True):
    """Table d'audit du pipeline vocal : une ligne par enregistrement, quel que soit son type.

    Le type (repas / exercice / activité) est déterminé par le contenu extrait,
    pas par une sélection préalable dans l'UI.
    """

    __tablename__ = "voice_captures"

    audio_url: str
    transcript_text: Optional[str] = None
    raw_extraction: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    status: CaptureStatus = Field(
        default=CaptureStatus.UPLOADED, sa_column=Column(String, nullable=False)
    )
    validated_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
