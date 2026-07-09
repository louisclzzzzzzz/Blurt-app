import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import MealType
from app.schemas.catalogue import ActivityTypeRead, ExerciseRead, FoodRead


class HistoryFoodConsumptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quantity_grams: float
    # Snapshot figé à la saisie — jamais recalculé depuis food_item ci-dessous,
    # qui ne sert qu'à l'affichage du nom/marque (cf. FoodConsumption).
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    food_item: FoodRead


class HistoryMealEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    logged_at: datetime
    meal_type: Optional[MealType] = None
    consumptions: list[HistoryFoodConsumptionRead]


class HistoryStrengthSetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = None
    exercise: ExerciseRead


class HistoryWorkoutSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    started_at: datetime
    ended_at: Optional[datetime] = None
    calories_kcal: Optional[float] = None
    sets: list[HistoryStrengthSetRead]


class HistoryActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    logged_at: datetime
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    calories_kcal: Optional[float] = None
    activity_type: ActivityTypeRead


class DayHistoryResponse(BaseModel):
    date: date
    meals: list[HistoryMealEntryRead]
    workout_sessions: list[HistoryWorkoutSessionRead]
    activity_logs: list[HistoryActivityLogRead]


# --- Édition/suppression d'entrées déjà validées ---------------------------
# Remplacement complet (pas de PATCH partiel) : le buffer d'édition frontend a
# toujours l'état complet sous la main (chargé via GET /history), contrairement
# aux fiches catalogue (schemas/catalogue.py) qui ont plus de champs et une
# correction ciblant typiquement un seul d'entre eux.


class UpdateConsumptionRequest(BaseModel):
    quantity_grams: float


class DeleteConsumptionResponse(BaseModel):
    meal_entry_deleted: bool


class UpdateSetRequest(BaseModel):
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = None


class DeleteSetResponse(BaseModel):
    session_deleted: bool
    session_calories_kcal: Optional[float] = None


class UpdateActivityLogRequest(BaseModel):
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
