import uuid
from datetime import datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship

from app.models.base import BaseTable
from app.models.food import EMBEDDING_DIM


class ActivityType(BaseTable, table=True):
    """Catalogue d'activités cardio/autres (course, vélo, natation...). Créé automatiquement si inconnu."""

    __tablename__ = "activity_types"

    name: str = Field(index=True)
    # MET (équivalent métabolique) estimé par le LLM à la création de la fiche
    # (cf. services/calories.py) — jamais redemandé ensuite.
    met_value: Optional[float] = None
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    aliases: list["ActivityAlias"] = Relationship(back_populates="activity_type")


class ActivityAlias(BaseTable, table=True):
    """Variante dictée d'une activité, apprise à chaque confirmation utilisateur."""

    __tablename__ = "activity_aliases"

    activity_type_id: uuid.UUID = Field(foreign_key="activity_types.id", index=True)
    alias_text: str = Field(index=True)
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    activity_type: ActivityType = Relationship(back_populates="aliases")


class ActivityLog(BaseTable, table=True):
    """Une activité loggée (durée/distance), horodatée."""

    __tablename__ = "activity_logs"

    activity_type_id: uuid.UUID = Field(foreign_key="activity_types.id", index=True)
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    # Snapshot calculé à l'enregistrement (poids de l'utilisateur x MET x durée) —
    # cf. services/calories.py. None si le profil ou le MET de l'activité sont inconnus.
    calories_kcal: Optional[float] = None
    notes: Optional[str] = None
    logged_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))

    activity_type: ActivityType = Relationship()
