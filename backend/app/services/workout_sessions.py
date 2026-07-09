from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout import WorkoutSession

# Seuil de regroupement : pas de nouvelle série depuis plus longtemps que ça
# -> nouvelle séance plutôt que rattachement à l'ancienne. Valeur de départ
# empirique (cf. plan, Phase 6 pour l'affinage à partir de l'usage réel).
SESSION_GAP = timedelta(hours=3)


async def get_or_create_active_session(session: AsyncSession, at: datetime) -> WorkoutSession:
    """Retourne la séance en cours si le dernier set date de moins de SESSION_GAP, sinon en crée une nouvelle."""
    stmt = select(WorkoutSession).order_by(WorkoutSession.started_at.desc()).limit(1)
    latest = (await session.execute(stmt)).scalar_one_or_none()
    if latest is not None:
        reference = latest.ended_at or latest.started_at
        if at - reference <= SESSION_GAP:
            return latest

    new_session = WorkoutSession(started_at=at)
    session.add(new_session)
    await session.flush()
    return new_session
