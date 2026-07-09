import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.enums import FoodSource
from app.models.food import FoodAlias, FoodItem
from app.models.meal import FoodConsumption
from app.schemas.catalogue import (
    FoodDetailRead,
    FoodRead,
    MergeRequest,
    MergeResponse,
    UpdateFoodRequest,
)
from app.services.catalogue import get_catalogue_entry_with_aliases, merge_catalogue_entries, search_catalogue
from app.services.embeddings import embed_texts

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("", response_model=list[FoodRead])
async def search_foods(
    query: str | None = Query(None, description="Recherche floue par nom (pg_trgm)"),
    limit: int = Query(20, le=100),
    source_group: Optional[Literal["ciqual", "custom"]] = Query(
        None, description="'ciqual' = aliments de base, 'custom' = créés (utilisateur/OFF)"
    ),
    session: AsyncSession = Depends(get_session),
) -> list[FoodItem]:
    """Recherche d'aliments par nom. Sans `query`, liste les aliments par ordre alphabétique."""
    extra_filter = None
    if source_group == "ciqual":
        extra_filter = FoodItem.source == FoodSource.CIQUAL
    elif source_group == "custom":
        extra_filter = FoodItem.source != FoodSource.CIQUAL
    return await search_catalogue(session, FoodItem, query, limit, extra_filter=extra_filter)


@router.get("/{food_id}", response_model=FoodDetailRead)
async def get_food(food_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> FoodItem:
    food = await get_catalogue_entry_with_aliases(session, FoodItem, food_id)
    if food is None:
        raise HTTPException(status_code=404, detail="Aliment introuvable")
    return food


@router.patch("/{food_id}", response_model=FoodDetailRead)
async def update_food(
    food_id: uuid.UUID, payload: UpdateFoodRequest, session: AsyncSession = Depends(get_session)
) -> FoodItem:
    food = await session.get(FoodItem, food_id)
    if food is None:
        raise HTTPException(status_code=404, detail="Aliment introuvable")

    changes = payload.model_dump(exclude_unset=True)
    name_changed = "name" in changes and changes["name"] != food.name
    for field, value in changes.items():
        setattr(food, field, value)

    # L'embedding stocké ne représenterait plus le nom corrigé sinon,
    # dégradant le matching futur — même traitement qu'un alias appris.
    if name_changed:
        [embedding] = await embed_texts([food.name])
        food.embedding = embedding

    session.add(food)
    await session.commit()

    updated = await get_catalogue_entry_with_aliases(session, FoodItem, food_id)
    assert updated is not None
    return updated


@router.delete("/{food_id}/aliases/{alias_id}", status_code=204)
async def delete_food_alias(
    food_id: uuid.UUID, alias_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    alias = await session.get(FoodAlias, alias_id)
    if alias is None or alias.food_item_id != food_id:
        raise HTTPException(status_code=404, detail="Alias introuvable")
    await session.delete(alias)
    await session.commit()


@router.post("/{food_id}/merge", response_model=MergeResponse)
async def merge_foods(
    food_id: uuid.UUID, payload: MergeRequest, session: AsyncSession = Depends(get_session)
) -> MergeResponse:
    """Fusionne food_id (supprimé) dans payload.target_id (survivant)."""
    try:
        outcome = await merge_catalogue_entries(
            session,
            item_model=FoodItem,
            alias_model=FoodAlias,
            alias_fk_name="food_item_id",
            reference_model=FoodConsumption,
            reference_fk_name="food_item_id",
            source_id=food_id,
            target_id=payload.target_id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await session.commit()
    return MergeResponse(
        target_id=payload.target_id,
        merged_alias_count=outcome.merged_alias_count,
        reassigned_reference_count=outcome.reassigned_reference_count,
    )
