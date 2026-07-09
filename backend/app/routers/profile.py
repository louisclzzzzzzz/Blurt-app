from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.profile import UserProfile
from app.schemas.api import UserProfileRead, UserProfileUpdate
from app.services.profile import get_user_profile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=UserProfileRead | None)
async def get_profile(session: AsyncSession = Depends(get_session)) -> UserProfile | None:
    """Mono-utilisateur : au plus une ligne. None si jamais renseigné (calories non calculées)."""
    return await get_user_profile(session)


@router.put("", response_model=UserProfileRead)
async def update_profile(
    payload: UserProfileUpdate, session: AsyncSession = Depends(get_session)
) -> UserProfile:
    """Upsert : crée le profil s'il n'existe pas encore, sinon met à jour l'unique ligne existante."""
    profile = await get_user_profile(session)
    if profile is None:
        profile = UserProfile(
            sex=payload.sex,
            birth_date=payload.birth_date,
            height_cm=payload.height_cm,
            weight_kg=payload.weight_kg,
            calorie_goal_kcal=payload.calorie_goal_kcal,
            protein_goal_g=payload.protein_goal_g,
            carbs_goal_g=payload.carbs_goal_g,
            fat_goal_g=payload.fat_goal_g,
        )
    else:
        profile.sex = payload.sex
        profile.birth_date = payload.birth_date
        profile.height_cm = payload.height_cm
        profile.weight_kg = payload.weight_kg
        profile.calorie_goal_kcal = payload.calorie_goal_kcal
        profile.protein_goal_g = payload.protein_goal_g
        profile.carbs_goal_g = payload.carbs_goal_g
        profile.fat_goal_g = payload.fat_goal_g
        profile.updated_at = datetime.now(timezone.utc)
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile
