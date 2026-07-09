import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.activity import ActivityLog, ActivityType
from app.schemas.api import ActivityLogRead
from app.schemas.history import UpdateActivityLogRequest
from app.services.calories import estimate_calories_kcal
from app.services.profile import get_user_profile

router = APIRouter(prefix="/activity-logs", tags=["activity-logs"])


@router.patch("/{activity_log_id}", response_model=ActivityLogRead)
async def update_activity_log(
    activity_log_id: uuid.UUID,
    payload: UpdateActivityLogRequest,
    session: AsyncSession = Depends(get_session),
) -> ActivityLog:
    log = await session.get(ActivityLog, activity_log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")

    log.duration_minutes = payload.duration_minutes
    log.distance_km = payload.distance_km

    # calories_kcal est directement proportionnel à duration_minutes ici
    # (contrairement à la musculation) : toujours recalculer.
    activity_type = await session.get(ActivityType, log.activity_type_id)
    profile = await get_user_profile(session)
    duration_hours = payload.duration_minutes / 60 if payload.duration_minutes else None
    log.calories_kcal = estimate_calories_kcal(
        activity_type.met_value if activity_type else None,
        profile.weight_kg if profile else None,
        duration_hours,
    )

    session.add(log)
    await session.commit()
    await session.refresh(log)
    return log


@router.delete("/{activity_log_id}", status_code=204)
async def delete_activity_log(
    activity_log_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    log = await session.get(ActivityLog, activity_log_id)
    if log is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    await session.delete(log)
    await session.commit()
