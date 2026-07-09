from datetime import date, datetime
from typing import Optional

from sqlalchemy import Column, DateTime, String
from sqlmodel import Field

from app.models.base import BaseTable, utcnow
from app.models.enums import Sex


class UserProfile(BaseTable, table=True):
    """Profil biométrique de l'utilisateur (mono-utilisateur : une seule ligne),
    utilisé pour estimer les calories dépensées (cf. services/calories.py) et
    porter les objectifs nutritionnels journaliers (récap calories/macros)."""

    __tablename__ = "user_profiles"

    sex: Sex = Field(sa_column=Column(String, nullable=False))
    birth_date: date
    height_cm: float
    weight_kg: float
    calorie_goal_kcal: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None
    updated_at: datetime = Field(default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False)
