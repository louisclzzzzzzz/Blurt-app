import uuid
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.workout import StrengthSet, WorkoutSession
from app.schemas.api import (
    CalorieVolumeDay,
    MuscleVolumeDay,
    MuscleVolumeGroup,
    StrengthSetRead,
    WeeklyMuscleVolumeResponse,
)
from app.schemas.history import DeleteSetResponse, UpdateSetRequest
from app.services.calories import compute_workout_session_calories
from app.services.clock import ASSUMED_TIMEZONE
from app.services.profile import get_user_profile
from app.services.volume import compute_weekly_muscle_volume, monday_of_week

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.get("/muscle-volume", response_model=WeeklyMuscleVolumeResponse)
async def get_weekly_muscle_volume(
    week_start: Optional[date] = Query(None, description="Lundi de la semaine. Défaut : semaine courante."),
    session: AsyncSession = Depends(get_session),
) -> WeeklyMuscleVolumeResponse:
    monday = monday_of_week(week_start) if week_start else monday_of_week(datetime.now(timezone.utc).astimezone(ASSUMED_TIMEZONE).date())
    volume = await compute_weekly_muscle_volume(session, monday)
    return WeeklyMuscleVolumeResponse(
        week_start=volume.week_start,
        muscle_groups=[
            MuscleVolumeGroup(
                muscle_group=muscle,
                daily_counts=[MuscleVolumeDay(date=d, sets=n) for d, n in daily.items()],
                total_sets=sum(daily.values()),
            )
            for muscle, daily in volume.counts.items()
        ],
        daily_calories=[CalorieVolumeDay(date=d, calories_kcal=c) for d, c in volume.calories_kcal.items()],
        total_calories_kcal=sum(volume.calories_kcal.values()),
    )


async def _recompute_session_calories(
    session: AsyncSession, workout_session_id: uuid.UUID
) -> Optional[float]:
    profile = await get_user_profile(session)
    return await compute_workout_session_calories(session, workout_session_id, profile)


@router.patch("/{session_id}/sets/{set_id}", response_model=StrengthSetRead)
async def update_set(
    session_id: uuid.UUID,
    set_id: uuid.UUID,
    payload: UpdateSetRequest,
    session: AsyncSession = Depends(get_session),
) -> StrengthSet:
    strength_set = await session.get(StrengthSet, set_id)
    if strength_set is None or strength_set.workout_session_id != session_id:
        raise HTTPException(status_code=404, detail="Série introuvable")

    strength_set.reps = payload.reps
    strength_set.weight_kg = payload.weight_kg
    strength_set.rir = payload.rir
    session.add(strength_set)

    # Recalcul systématique, même si reps/poids/RIR ne changent rien au calcul
    # aujourd'hui (qui ne dépend que du MET et du nombre de séries) : pas de
    # couplage codé en dur à la formule actuelle, que la Phase 6 doit pouvoir
    # affiner sans casser cette invariante.
    workout_session = await session.get(WorkoutSession, session_id)
    if workout_session is not None:
        workout_session.calories_kcal = await _recompute_session_calories(session, session_id)
        session.add(workout_session)

    await session.commit()
    await session.refresh(strength_set)
    return strength_set


@router.delete("/{session_id}/sets/{set_id}", response_model=DeleteSetResponse)
async def delete_set(
    session_id: uuid.UUID,
    set_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> DeleteSetResponse:
    strength_set = await session.get(StrengthSet, set_id)
    if strength_set is None or strength_set.workout_session_id != session_id:
        raise HTTPException(status_code=404, detail="Série introuvable")

    await session.delete(strength_set)
    await session.flush()

    remaining = (
        await session.execute(
            select(func.count())
            .select_from(StrengthSet)
            .where(StrengthSet.workout_session_id == session_id)
        )
    ).scalar_one()

    # Séance vidée de sa dernière série : pas de valeur à garder une séance
    # fantôme sans contenu.
    session_deleted = False
    session_calories: Optional[float] = None
    if remaining == 0:
        workout_session = await session.get(WorkoutSession, session_id)
        if workout_session is not None:
            await session.delete(workout_session)
            session_deleted = True
    else:
        session_calories = await _recompute_session_calories(session, session_id)
        workout_session = await session.get(WorkoutSession, session_id)
        if workout_session is not None:
            workout_session.calories_kcal = session_calories
            session.add(workout_session)

    await session.commit()
    return DeleteSetResponse(session_deleted=session_deleted, session_calories_kcal=session_calories)


@router.delete("/{session_id}", status_code=204)
async def delete_workout_session(
    session_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    workout_session = await session.get(WorkoutSession, session_id)
    if workout_session is None:
        raise HTTPException(status_code=404, detail="Séance introuvable")
    await session.execute(delete(StrengthSet).where(StrengthSet.workout_session_id == session_id))
    await session.delete(workout_session)
    await session.commit()
