"""Volume hebdomadaire (nombre de séries) par groupe musculaire.

Une série compte pour chaque muscle ciblé par son exercice (pas de répartition/
division du poids d'une série entre plusieurs muscles) — cohérent avec le fait
que target_muscles est une liste de muscles réellement sollicités, pas une
pondération.
"""

from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog
from app.models.enums import MuscleGroup
from app.models.exercise import StrengthExercise
from app.models.workout import StrengthSet, WorkoutSession
from app.services.clock import ASSUMED_TIMEZONE, day_bounds_utc


def monday_of_week(day: date) -> date:
    return day - timedelta(days=day.weekday())


@dataclass
class WeeklyMuscleVolume:
    week_start: date
    # muscle_group -> {day: nombre de séries}
    counts: dict[MuscleGroup, dict[date, int]]
    # jour -> calories brûlées (musculation + cardio), estimation cf. services/calories.py
    calories_kcal: dict[date, float]


async def compute_weekly_muscle_volume(session: AsyncSession, week_start: date) -> WeeklyMuscleVolume:
    week_days = [week_start + timedelta(days=i) for i in range(7)]
    week_start_utc = day_bounds_utc(week_days[0])[0]
    week_end_utc = day_bounds_utc(week_days[-1])[1]

    rows = (
        await session.execute(
            select(StrengthSet.logged_at, StrengthExercise.target_muscles)
            .join(StrengthExercise, StrengthSet.exercise_id == StrengthExercise.id)
            .where(StrengthSet.logged_at >= week_start_utc, StrengthSet.logged_at < week_end_utc)
        )
    ).all()

    counts: dict[MuscleGroup, dict[date, int]] = {m: {d: 0 for d in week_days} for m in MuscleGroup}
    for logged_at, target_muscles in rows:
        local_day = logged_at.astimezone(ASSUMED_TIMEZONE).date()
        if local_day not in week_days:
            continue
        for raw_muscle in target_muscles:
            try:
                muscle = MuscleGroup(raw_muscle)
            except ValueError:
                continue
            counts[muscle][local_day] += 1

    calories_kcal: dict[date, float] = {d: 0.0 for d in week_days}
    # Une séance est rattachée au jour de son started_at uniquement (cf. history.py) —
    # même convention reprise ici, pas celle de chaque set individuel.
    workout_rows = (
        await session.execute(
            select(WorkoutSession.started_at, WorkoutSession.calories_kcal).where(
                WorkoutSession.started_at >= week_start_utc, WorkoutSession.started_at < week_end_utc
            )
        )
    ).all()
    for started_at, session_calories in workout_rows:
        local_day = started_at.astimezone(ASSUMED_TIMEZONE).date()
        if local_day in calories_kcal and session_calories is not None:
            calories_kcal[local_day] += session_calories

    activity_rows = (
        await session.execute(
            select(ActivityLog.logged_at, ActivityLog.calories_kcal).where(
                ActivityLog.logged_at >= week_start_utc, ActivityLog.logged_at < week_end_utc
            )
        )
    ).all()
    for logged_at, log_calories in activity_rows:
        local_day = logged_at.astimezone(ASSUMED_TIMEZONE).date()
        if local_day in calories_kcal and log_calories is not None:
            calories_kcal[local_day] += log_calories

    return WeeklyMuscleVolume(week_start=week_start, counts=counts, calories_kcal=calories_kcal)
