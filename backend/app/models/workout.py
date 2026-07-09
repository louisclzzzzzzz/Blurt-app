import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime
from sqlmodel import Field, Relationship

from app.models.base import BaseTable
from app.models.exercise import StrengthExercise


class WorkoutSession(BaseTable, table=True):
    """Séance de musculation, auto-regroupée à partir des exercices dictés dans une même fenêtre de temps."""

    __tablename__ = "workout_sessions"

    # sa_column=Column(DateTime(timezone=True)) explicite partout : SQLModel
    # mappe `datetime` nu sur un TIMESTAMP WITHOUT TIME ZONE par défaut, alors
    # que nos valeurs Python sont toujours tz-aware (UTC) — sans cet override,
    # asyncpg refuse le bind ("can't subtract offset-naive and offset-aware
    # datetimes").
    started_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    ended_at: Optional[datetime] = Field(default=None, sa_column=Column(DateTime(timezone=True)))
    # Estimation grossière recalculée à chaque set ajouté à la séance — cf.
    # services/calories.py (pas de durée mesurée par série, forfait par set).
    calories_kcal: Optional[float] = None
    notes: Optional[str] = None

    sets: list["StrengthSet"] = Relationship(back_populates="session")


class StrengthSet(BaseTable, table=True):
    """Une série réalisée (reps/poids) pour un exercice donné, au sein d'une séance."""

    __tablename__ = "strength_sets"

    workout_session_id: uuid.UUID = Field(foreign_key="workout_sessions.id", index=True)
    exercise_id: uuid.UUID = Field(foreign_key="strength_exercises.id", index=True)
    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = None  # répétitions en réserve
    notes: Optional[str] = None
    logged_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))

    session: WorkoutSession = Relationship(back_populates="sets")
    exercise: StrengthExercise = Relationship()
