import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import MealType, MuscleGroup
from app.schemas.extraction import DictatedMacros


class MatchCandidate(BaseModel):
    food_item_id: uuid.UUID
    name: str
    brand: Optional[str] = None
    score: float
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    default_portion_label: Optional[str] = None
    default_portion_grams: Optional[float] = None


class OffCandidate(BaseModel):
    """Candidat trouvé via Open Food Facts, pas encore en base — proposé pour création."""

    off_barcode: Optional[str] = None
    name: str
    brand: Optional[str] = None
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    saturated_fat_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    salt_g: Optional[float] = None


class PendingFoodItem(BaseModel):
    spoken_name: str
    quantity_grams: Optional[float] = None
    quantity_units: Optional[float] = None
    quantity_description: Optional[str] = None
    is_packaged_product: bool = False
    dictated_macros: Optional[DictatedMacros] = None
    match_confidence: Literal["high", "ambiguous", "none"]
    candidates: list[MatchCandidate] = []
    off_candidates: list[OffCandidate] = []
    needs_quantity_confirmation: bool = False


class ExerciseCandidate(BaseModel):
    exercise_id: uuid.UUID
    name: str
    score: float


class PendingStrengthSetItem(BaseModel):
    spoken_exercise_name: str
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = None
    met_estimate: Optional[float] = None
    target_muscles_estimate: list[MuscleGroup] = []
    match_confidence: Literal["high", "ambiguous", "none"]
    candidates: list[ExerciseCandidate] = []


class ActivityCandidate(BaseModel):
    activity_type_id: uuid.UUID
    name: str
    score: float


class PendingActivityItem(BaseModel):
    spoken_activity_name: str
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    met_estimate: Optional[float] = None
    match_confidence: Literal["high", "ambiguous", "none"]
    candidates: list[ActivityCandidate] = []


class CaptureCreateResponse(BaseModel):
    capture_id: uuid.UUID
    transcript: str
    food_items: list[PendingFoodItem]
    strength_items: list[PendingStrengthSetItem]
    activity_items: list[PendingActivityItem]


class TextCaptureRequest(BaseModel):
    """Simule une transcription sans passer par l'audio/Voxtral — utile pour tester
    extraction/matching/validation sans micro (dev/debug)."""

    transcript: str


class NewFoodInput(BaseModel):
    """Création d'un aliment inédit — produit emballé dicté par l'utilisateur ou repris d'Open Food Facts."""

    name: str
    brand: Optional[str] = None
    off_barcode: Optional[str] = None
    is_packaged: bool = True
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    saturated_fat_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    salt_g: Optional[float] = None


class ValidatedFoodItem(BaseModel):
    spoken_name: str
    quantity_grams: float
    food_item_id: Optional[uuid.UUID] = None
    create_new_food: Optional[NewFoodInput] = None


class ValidatedStrengthSetItem(BaseModel):
    spoken_exercise_name: str
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = None
    # Estimation LLM du MET, portée depuis PendingStrengthSetItem sans modification
    # côté frontend — utilisée uniquement si un nouvel exercice est créé (cf. plus bas).
    met_estimate: Optional[float] = None
    # Idem pour les groupes musculaires ciblés estimés par le LLM.
    target_muscles_estimate: list[MuscleGroup] = []
    # None -> création automatique d'un nouvel exercice (pas de macros à
    # fournir, contrairement aux aliments : pas besoin de confirmation
    # supplémentaire, cf. plan).
    exercise_id: Optional[uuid.UUID] = None


class ValidatedActivityItem(BaseModel):
    spoken_activity_name: str
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    met_estimate: Optional[float] = None
    # None -> création automatique d'une nouvelle activité, même logique que les exercices.
    activity_type_id: Optional[uuid.UUID] = None


class ValidateCaptureRequest(BaseModel):
    logged_at: Optional[datetime] = None
    meal_type: Optional[MealType] = None
    food_items: list[ValidatedFoodItem] = []
    strength_items: list[ValidatedStrengthSetItem] = []
    activity_items: list[ValidatedActivityItem] = []


class FoodConsumptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    food_item_id: uuid.UUID
    quantity_grams: float
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float


class StrengthSetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exercise_id: uuid.UUID
    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = None


class ActivityLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity_type_id: uuid.UUID
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    calories_kcal: Optional[float] = None


class ValidateCaptureResponse(BaseModel):
    meal_entry_id: Optional[uuid.UUID] = None
    consumptions: list[FoodConsumptionRead] = []
    workout_session_id: Optional[uuid.UUID] = None
    # Estimation grossière (cf. services/calories.py) : durée non mesurée par
    # série, dérivée d'un forfait par série. None si le profil (poids) ou le
    # MET de l'exercice sont inconnus.
    workout_session_calories_kcal: Optional[float] = None
    strength_sets: list[StrengthSetRead] = []
    activity_logs: list[ActivityLogRead] = []


class UserProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sex: Literal["male", "female"]
    birth_date: date
    height_cm: float
    weight_kg: float
    calorie_goal_kcal: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None


class UserProfileUpdate(BaseModel):
    sex: Literal["male", "female"]
    birth_date: date
    height_cm: float
    weight_kg: float
    calorie_goal_kcal: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None


class MuscleVolumeDay(BaseModel):
    date: date
    sets: int


class MuscleVolumeGroup(BaseModel):
    muscle_group: MuscleGroup
    daily_counts: list[MuscleVolumeDay]
    total_sets: int


class CalorieVolumeDay(BaseModel):
    date: date
    calories_kcal: float


class WeeklyMuscleVolumeResponse(BaseModel):
    week_start: date
    muscle_groups: list[MuscleVolumeGroup]
    daily_calories: list[CalorieVolumeDay]
    total_calories_kcal: float
