from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import UserProfile


async def get_user_profile(session: AsyncSession) -> Optional[UserProfile]:
    """Mono-utilisateur : au plus une ligne. None si jamais renseigné."""
    return (await session.execute(select(UserProfile).limit(1))).scalar_one_or_none()
