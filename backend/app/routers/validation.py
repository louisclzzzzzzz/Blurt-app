import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.activity import ActivityAlias, ActivityLog, ActivityType
from app.models.enums import CaptureStatus, FoodSource, MealType
from app.models.exercise import ExerciseAlias, StrengthExercise
from app.models.food import FoodAlias, FoodItem
from app.models.meal import FoodConsumption, MealEntry
from app.models.profile import UserProfile
from app.models.voice_capture import VoiceCapture
from app.models.workout import StrengthSet
from app.schemas.api import (
    ValidatedActivityItem,
    ValidatedFoodItem,
    ValidatedStrengthSetItem,
    ValidateCaptureRequest,
    ValidateCaptureResponse,
)
from app.services.calories import compute_workout_session_calories, estimate_calories_kcal
from app.services.clock import ASSUMED_TIMEZONE
from app.services.embeddings import embed_texts
from app.services.profile import get_user_profile
from app.services.workout_sessions import get_or_create_active_session

router = APIRouter(prefix="/captures", tags=["validation"])


def infer_meal_type(dt: datetime) -> MealType:
    local_hour = dt.astimezone(ASSUMED_TIMEZONE).hour
    if 5 <= local_hour < 11:
        return MealType.BREAKFAST
    if 11 <= local_hour < 15:
        return MealType.LUNCH
    if 15 <= local_hour < 19:
        return MealType.SNACK
    return MealType.DINNER


@router.post("/{capture_id}/validate", response_model=ValidateCaptureResponse)
async def validate_capture(
    capture_id: uuid.UUID,
    payload: ValidateCaptureRequest,
    session: AsyncSession = Depends(get_session),
) -> ValidateCaptureResponse:
    capture = await session.get(VoiceCapture, capture_id)
    if capture is None:
        raise HTTPException(status_code=404, detail="Capture introuvable")

    now = datetime.now(timezone.utc)
    logged_at = payload.logged_at or now

    # Poids nécessaire au calcul des calories (musculation/activités) —
    # récupéré une seule fois, absent -> calories_kcal restera None (pas d'erreur).
    profile: Optional[UserProfile] = None
    if payload.strength_items or payload.activity_items:
        profile = await get_user_profile(session)

    meal_entry_id = None
    consumptions = []
    if payload.food_items:
        meal_type = payload.meal_type or infer_meal_type(logged_at)
        meal = MealEntry(logged_at=logged_at, meal_type=meal_type)
        session.add(meal)
        await session.flush()

        for item in payload.food_items:
            food_item = await _resolve_or_create_food(session, item)
            await _learn_food_alias(session, food_item.id, item.spoken_name)

            factor = item.quantity_grams / 100
            consumption = FoodConsumption(
                meal_entry_id=meal.id,
                food_item_id=food_item.id,
                quantity_grams=item.quantity_grams,
                energy_kcal=food_item.energy_kcal * factor,
                protein_g=food_item.protein_g * factor,
                carbs_g=food_item.carbs_g * factor,
                fat_g=food_item.fat_g * factor,
            )
            session.add(consumption)
            consumptions.append(consumption)
        meal_entry_id = meal.id

    workout_session_id = None
    workout_session_calories_kcal = None
    strength_sets: list[StrengthSet] = []
    if payload.strength_items:
        workout_session = await get_or_create_active_session(session, logged_at)
        set_number = (
            await session.execute(
                select(func.count())
                .select_from(StrengthSet)
                .where(StrengthSet.workout_session_id == workout_session.id)
            )
        ).scalar_one()

        # Plusieurs séries dictées à la suite partagent souvent le même nom
        # d'exercice sans exercise_id résolu (aucun candidat) : dédoublonner
        # au sein de la requête pour ne créer qu'une seule fiche, pas une par série.
        created_exercises: dict[str, StrengthExercise] = {}
        for item in payload.strength_items:
            exercise = await _resolve_or_create_exercise(session, item, created_exercises)
            await _learn_exercise_alias(session, exercise.id, item.spoken_exercise_name)

            set_number += 1
            strength_set = StrengthSet(
                workout_session_id=workout_session.id,
                exercise_id=exercise.id,
                set_number=set_number,
                reps=item.reps,
                weight_kg=item.weight_kg,
                rir=item.rir,
                logged_at=logged_at,
            )
            session.add(strength_set)
            strength_sets.append(strength_set)

        workout_session.ended_at = logged_at
        # flush avant l'agrégation ci-dessous : les StrengthSet ajoutés plus haut
        # n'ont pas encore de ligne visible en base pour la requête SELECT.
        await session.flush()
        workout_session.calories_kcal = await compute_workout_session_calories(
            session, workout_session.id, profile
        )
        session.add(workout_session)
        workout_session_id = workout_session.id
        workout_session_calories_kcal = workout_session.calories_kcal

    activity_logs: list[ActivityLog] = []
    if payload.activity_items:
        # Même dédoublonnage que pour les exercices : peu probable en pratique
        # (une activité cardio est rarement répétée dans la même prise), mais
        # cohérent avec le reste du pipeline si ça arrive.
        created_activities: dict[str, ActivityType] = {}
        for item in payload.activity_items:
            activity_type = await _resolve_or_create_activity(session, item, created_activities)
            await _learn_activity_alias(session, activity_type.id, item.spoken_activity_name)

            duration_hours = item.duration_minutes / 60 if item.duration_minutes else None
            calories = estimate_calories_kcal(
                activity_type.met_value, profile.weight_kg if profile else None, duration_hours
            )
            activity_log = ActivityLog(
                activity_type_id=activity_type.id,
                duration_minutes=item.duration_minutes,
                distance_km=item.distance_km,
                calories_kcal=calories,
                logged_at=logged_at,
            )
            session.add(activity_log)
            activity_logs.append(activity_log)

    capture.status = CaptureStatus.VALIDATED
    capture.validated_at = now
    session.add(capture)

    await session.commit()
    for c in consumptions:
        await session.refresh(c)
    for s in strength_sets:
        await session.refresh(s)
    for a in activity_logs:
        await session.refresh(a)

    return ValidateCaptureResponse(
        meal_entry_id=meal_entry_id,
        consumptions=consumptions,
        workout_session_id=workout_session_id,
        workout_session_calories_kcal=workout_session_calories_kcal,
        strength_sets=strength_sets,
        activity_logs=activity_logs,
    )


async def _resolve_or_create_food(session: AsyncSession, item: ValidatedFoodItem) -> FoodItem:
    if item.food_item_id is not None:
        food = await session.get(FoodItem, item.food_item_id)
        if food is None:
            raise HTTPException(status_code=404, detail=f"Aliment {item.food_item_id} introuvable")
        return food

    if item.create_new_food is not None:
        data = item.create_new_food
        [embedding] = await embed_texts([data.name])
        food = FoodItem(
            name=data.name,
            source=FoodSource.OFF if data.off_barcode else FoodSource.USER,
            is_packaged=data.is_packaged,
            brand=data.brand,
            off_barcode=data.off_barcode,
            energy_kcal=data.energy_kcal,
            protein_g=data.protein_g,
            carbs_g=data.carbs_g,
            fat_g=data.fat_g,
            saturated_fat_g=data.saturated_fat_g,
            sugars_g=data.sugars_g,
            fiber_g=data.fiber_g,
            salt_g=data.salt_g,
            embedding=embedding,
        )
        session.add(food)
        await session.flush()
        return food

    raise HTTPException(status_code=400, detail="food_item_id ou create_new_food requis")


async def _resolve_or_create_exercise(
    session: AsyncSession,
    item: ValidatedStrengthSetItem,
    created_this_request: dict[str, StrengthExercise],
) -> StrengthExercise:
    if item.exercise_id is not None:
        exercise = await session.get(StrengthExercise, item.exercise_id)
        if exercise is None:
            raise HTTPException(status_code=404, detail=f"Exercice {item.exercise_id} introuvable")
        return exercise

    cache_key = item.spoken_exercise_name.lower()
    if cache_key in created_this_request:
        return created_this_request[cache_key]

    # Pas de candidat retenu : création automatique, pas de confirmation
    # nécessaire (pas de macros à fournir, contrairement à un aliment).
    # met_estimate/target_muscles_estimate viennent du LLM d'extraction (cf.
    # schemas/extraction.py) : stockés une fois pour toutes sur la fiche,
    # jamais redemandés ensuite.
    [embedding] = await embed_texts([item.spoken_exercise_name])
    exercise = StrengthExercise(
        name=item.spoken_exercise_name,
        met_value=item.met_estimate,
        target_muscles=[m.value for m in item.target_muscles_estimate],
        embedding=embedding,
    )
    session.add(exercise)
    await session.flush()
    created_this_request[cache_key] = exercise
    return exercise


async def _learn_food_alias(session: AsyncSession, food_item_id: uuid.UUID, spoken_name: str) -> None:
    """Mémorise la formulation dictée pour un match direct la prochaine fois (jamais redemander)."""
    existing = await session.execute(
        select(FoodAlias).where(
            FoodAlias.food_item_id == food_item_id,
            func.lower(FoodAlias.alias_text) == spoken_name.lower(),
        )
    )
    if existing.scalar_one_or_none() is not None:
        return
    [embedding] = await embed_texts([spoken_name])
    session.add(FoodAlias(food_item_id=food_item_id, alias_text=spoken_name, embedding=embedding))


async def _learn_exercise_alias(session: AsyncSession, exercise_id: uuid.UUID, spoken_name: str) -> None:
    existing = await session.execute(
        select(ExerciseAlias).where(
            ExerciseAlias.exercise_id == exercise_id,
            func.lower(ExerciseAlias.alias_text) == spoken_name.lower(),
        )
    )
    if existing.scalar_one_or_none() is not None:
        return
    [embedding] = await embed_texts([spoken_name])
    session.add(ExerciseAlias(exercise_id=exercise_id, alias_text=spoken_name, embedding=embedding))


async def _resolve_or_create_activity(
    session: AsyncSession,
    item: ValidatedActivityItem,
    created_this_request: dict[str, ActivityType],
) -> ActivityType:
    if item.activity_type_id is not None:
        activity_type = await session.get(ActivityType, item.activity_type_id)
        if activity_type is None:
            raise HTTPException(status_code=404, detail=f"Activité {item.activity_type_id} introuvable")
        return activity_type

    cache_key = item.spoken_activity_name.lower()
    if cache_key in created_this_request:
        return created_this_request[cache_key]

    [embedding] = await embed_texts([item.spoken_activity_name])
    activity_type = ActivityType(name=item.spoken_activity_name, met_value=item.met_estimate, embedding=embedding)
    session.add(activity_type)
    await session.flush()
    created_this_request[cache_key] = activity_type
    return activity_type


async def _learn_activity_alias(session: AsyncSession, activity_type_id: uuid.UUID, spoken_name: str) -> None:
    existing = await session.execute(
        select(ActivityAlias).where(
            ActivityAlias.activity_type_id == activity_type_id,
            func.lower(ActivityAlias.alias_text) == spoken_name.lower(),
        )
    )
    if existing.scalar_one_or_none() is not None:
        return
    [embedding] = await embed_texts([spoken_name])
    session.add(ActivityAlias(activity_type_id=activity_type_id, alias_text=spoken_name, embedding=embedding))
