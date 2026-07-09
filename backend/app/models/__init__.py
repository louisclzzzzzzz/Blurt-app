"""Importer tous les modèles ici pour que SQLModel.metadata les connaisse (Alembic autogenerate en dépend)."""

from app.models.activity import ActivityAlias, ActivityLog, ActivityType
from app.models.exercise import ExerciseAlias, StrengthExercise
from app.models.food import FoodAlias, FoodItem
from app.models.meal import FoodConsumption, MealEntry
from app.models.profile import UserProfile
from app.models.voice_capture import VoiceCapture
from app.models.workout import StrengthSet, WorkoutSession

__all__ = [
    "ActivityAlias",
    "ActivityLog",
    "ActivityType",
    "ExerciseAlias",
    "StrengthExercise",
    "FoodAlias",
    "FoodItem",
    "FoodConsumption",
    "MealEntry",
    "UserProfile",
    "VoiceCapture",
    "StrengthSet",
    "WorkoutSession",
]
