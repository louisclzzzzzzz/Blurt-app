import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.food import FoodItem
from app.models.meal import FoodConsumption, MealEntry
from app.schemas.api import FoodConsumptionRead
from app.schemas.history import DeleteConsumptionResponse, UpdateConsumptionRequest

router = APIRouter(prefix="/meals", tags=["meals"])


@router.patch("/{meal_id}/consumptions/{consumption_id}", response_model=FoodConsumptionRead)
async def update_consumption(
    meal_id: uuid.UUID,
    consumption_id: uuid.UUID,
    payload: UpdateConsumptionRequest,
    session: AsyncSession = Depends(get_session),
) -> FoodConsumption:
    consumption = await session.get(FoodConsumption, consumption_id)
    if consumption is None or consumption.meal_entry_id != meal_id:
        raise HTTPException(status_code=404, detail="Ligne de repas introuvable")

    food_item = await session.get(FoodItem, consumption.food_item_id)
    if food_item is None:
        raise HTTPException(status_code=404, detail="Aliment introuvable")

    # Recalcul explicite de la ligne qu'on édite, depuis les macros actuelles de
    # food_item — pas une violation de la règle anti-dérive (celle-ci interdit un
    # recalcul silencieux quand le catalogue change ailleurs, pas ce cas-ci).
    factor = payload.quantity_grams / 100
    consumption.quantity_grams = payload.quantity_grams
    consumption.energy_kcal = food_item.energy_kcal * factor
    consumption.protein_g = food_item.protein_g * factor
    consumption.carbs_g = food_item.carbs_g * factor
    consumption.fat_g = food_item.fat_g * factor

    session.add(consumption)
    await session.commit()
    await session.refresh(consumption)
    return consumption


@router.delete("/{meal_id}/consumptions/{consumption_id}", response_model=DeleteConsumptionResponse)
async def delete_consumption(
    meal_id: uuid.UUID,
    consumption_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> DeleteConsumptionResponse:
    consumption = await session.get(FoodConsumption, consumption_id)
    if consumption is None or consumption.meal_entry_id != meal_id:
        raise HTTPException(status_code=404, detail="Ligne de repas introuvable")

    await session.delete(consumption)
    await session.flush()

    remaining = (
        await session.execute(
            select(func.count())
            .select_from(FoodConsumption)
            .where(FoodConsumption.meal_entry_id == meal_id)
        )
    ).scalar_one()

    # Repas vidé de sa dernière ligne : pas de valeur à garder un repas fantôme sans contenu.
    meal_deleted = False
    if remaining == 0:
        meal = await session.get(MealEntry, meal_id)
        if meal is not None:
            await session.delete(meal)
            meal_deleted = True

    await session.commit()
    return DeleteConsumptionResponse(meal_entry_deleted=meal_deleted)


@router.delete("/{meal_id}", status_code=204)
async def delete_meal(meal_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> None:
    meal = await session.get(MealEntry, meal_id)
    if meal is None:
        raise HTTPException(status_code=404, detail="Repas introuvable")
    # Cascade applicative (pas de ondelete="CASCADE" en base) : cohérent avec le
    # reste du code où les règles métier sont explicites en Python.
    await session.execute(delete(FoodConsumption).where(FoodConsumption.meal_entry_id == meal_id))
    await session.delete(meal)
    await session.commit()
