import uuid
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Column, String
from sqlmodel import Field, Relationship

from app.models.base import BaseTable
from app.models.food import EMBEDDING_DIM


class StrengthExercise(BaseTable, table=True):
    """Catalogue d'exercices de musculation. Créé automatiquement à la première dictée d'un exercice inconnu."""

    __tablename__ = "strength_exercises"

    name: str = Field(index=True)
    equipment: Optional[str] = None
    # Groupes musculaires ciblés (app.models.enums.MuscleGroup), stockés en
    # VARCHAR[] plutôt qu'un enum Postgres natif — même logique que FoodSource :
    # ajouter une valeur ne nécessite pas de migration de type de colonne.
    target_muscles: list[str] = Field(default_factory=list, sa_column=Column(ARRAY(String)))
    # MET (équivalent métabolique) estimé par le LLM à la création de la fiche
    # (cf. services/calories.py) — jamais redemandé ensuite, même logique que
    # les macros dictées une fois pour un aliment emballé.
    met_value: Optional[float] = None
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    aliases: list["ExerciseAlias"] = Relationship(back_populates="exercise")


class ExerciseAlias(BaseTable, table=True):
    """Variante dictée d'un exercice, apprise à chaque confirmation utilisateur."""

    __tablename__ = "exercise_aliases"

    exercise_id: uuid.UUID = Field(foreign_key="strength_exercises.id", index=True)
    alias_text: str = Field(index=True)
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    exercise: StrengthExercise = Relationship(back_populates="aliases")
