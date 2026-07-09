from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_session
from app.models.activity import ActivityLog
from app.models.meal import FoodConsumption, MealEntry
from app.models.workout import StrengthSet, WorkoutSession
from app.schemas.history import DayHistoryResponse
from app.services.clock import day_bounds_utc

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=DayHistoryResponse)
async def get_day_history(
    date: date, session: AsyncSession = Depends(get_session)
) -> DayHistoryResponse:
    """Vue consolidée d'une journée : repas / séances / activités, chacun avec
    son détail (aliments consommés, séries par exercice) déjà chargé.

    Une séance de musculation est rattachée au jour de son started_at
    uniquement (jamais scindée sur deux jours, même si SESSION_GAP la fait
    déborder après minuit) : une séance = une carte = un total calories.
    """
    start_utc, end_utc = day_bounds_utc(date)

    meals = (
        (
            await session.execute(
                select(MealEntry)
                .where(MealEntry.logged_at >= start_utc, MealEntry.logged_at < end_utc)
                .order_by(MealEntry.logged_at)
                .options(selectinload(MealEntry.consumptions).selectinload(FoodConsumption.food_item))
            )
        )
        .scalars()
        .all()
    )

    workout_sessions = (
        (
            await session.execute(
                select(WorkoutSession)
                .where(WorkoutSession.started_at >= start_utc, WorkoutSession.started_at < end_utc)
                .order_by(WorkoutSession.started_at)
                .options(selectinload(WorkoutSession.sets).selectinload(StrengthSet.exercise))
            )
        )
        .scalars()
        .all()
    )

    activity_logs = (
        (
            await session.execute(
                select(ActivityLog)
                .where(ActivityLog.logged_at >= start_utc, ActivityLog.logged_at < end_utc)
                .order_by(ActivityLog.logged_at)
                .options(selectinload(ActivityLog.activity_type))
            )
        )
        .scalars()
        .all()
    )

    return DayHistoryResponse(
        date=date,
        meals=list(meals),
        workout_sessions=list(workout_sessions),
        activity_logs=list(activity_logs),
    )
