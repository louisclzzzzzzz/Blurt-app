import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.enums import FoodSource, MuscleGroup


class FoodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    source: FoodSource
    is_packaged: bool
    brand: Optional[str] = None
    ciqual_code: Optional[str] = None
    off_barcode: Optional[str] = None
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    saturated_fat_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    salt_g: Optional[float] = None
    default_portion_label: Optional[str] = None
    default_portion_grams: Optional[float] = None


class ExerciseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    equipment: Optional[str] = None
    target_muscles: list[MuscleGroup] = []
    met_value: Optional[float] = None


class ActivityTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    met_value: Optional[float] = None


class AliasRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    alias_text: str


class FoodDetailRead(FoodRead):
    aliases: list[AliasRead] = []


class ExerciseDetailRead(ExerciseRead):
    aliases: list[AliasRead] = []


class ActivityTypeDetailRead(ActivityTypeRead):
    aliases: list[AliasRead] = []


# --- Correction/fusion de fiches catalogue ----------------------------------
# PATCH partiel (exclude_unset) ici, contrairement au remplacement complet des
# PATCH d'historique (schemas/history.py) : ces fiches ont plus de champs et
# une correction cible typiquement un seul d'entre eux.


class UpdateFoodRequest(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    energy_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    salt_g: Optional[float] = None
    default_portion_label: Optional[str] = None
    default_portion_grams: Optional[float] = None


class UpdateExerciseRequest(BaseModel):
    name: Optional[str] = None
    equipment: Optional[str] = None
    target_muscles: Optional[list[MuscleGroup]] = None
    met_value: Optional[float] = None


class UpdateActivityTypeRequest(BaseModel):
    name: Optional[str] = None
    met_value: Optional[float] = None


class MergeRequest(BaseModel):
    target_id: uuid.UUID


class MergeResponse(BaseModel):
    target_id: uuid.UUID
    merged_alias_count: int
    reassigned_reference_count: int
