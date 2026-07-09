import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.activity import ActivityAlias, ActivityLog, ActivityType
from app.schemas.catalogue import (
    ActivityTypeDetailRead,
    ActivityTypeRead,
    MergeRequest,
    MergeResponse,
    UpdateActivityTypeRequest,
)
from app.services.catalogue import get_catalogue_entry_with_aliases, merge_catalogue_entries, search_catalogue
from app.services.embeddings import embed_texts

router = APIRouter(prefix="/activities", tags=["activities"])


@router.get("", response_model=list[ActivityTypeRead])
async def search_activities(
    query: str | None = Query(None, description="Recherche floue par nom (pg_trgm)"),
    limit: int = Query(20, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[ActivityType]:
    """Recherche d'activités par nom. Sans `query`, liste par ordre alphabétique."""
    return await search_catalogue(session, ActivityType, query, limit)


@router.get("/{activity_type_id}", response_model=ActivityTypeDetailRead)
async def get_activity(
    activity_type_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> ActivityType:
    activity_type = await get_catalogue_entry_with_aliases(session, ActivityType, activity_type_id)
    if activity_type is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")
    return activity_type


@router.patch("/{activity_type_id}", response_model=ActivityTypeDetailRead)
async def update_activity(
    activity_type_id: uuid.UUID,
    payload: UpdateActivityTypeRequest,
    session: AsyncSession = Depends(get_session),
) -> ActivityType:
    activity_type = await session.get(ActivityType, activity_type_id)
    if activity_type is None:
        raise HTTPException(status_code=404, detail="Activité introuvable")

    changes = payload.model_dump(exclude_unset=True)
    name_changed = "name" in changes and changes["name"] != activity_type.name
    for field, value in changes.items():
        setattr(activity_type, field, value)

    if name_changed:
        [embedding] = await embed_texts([activity_type.name])
        activity_type.embedding = embedding

    session.add(activity_type)
    await session.commit()

    updated = await get_catalogue_entry_with_aliases(session, ActivityType, activity_type_id)
    assert updated is not None
    return updated


@router.delete("/{activity_type_id}/aliases/{alias_id}", status_code=204)
async def delete_activity_alias(
    activity_type_id: uuid.UUID, alias_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    alias = await session.get(ActivityAlias, alias_id)
    if alias is None or alias.activity_type_id != activity_type_id:
        raise HTTPException(status_code=404, detail="Alias introuvable")
    await session.delete(alias)
    await session.commit()


@router.post("/{activity_type_id}/merge", response_model=MergeResponse)
async def merge_activities(
    activity_type_id: uuid.UUID, payload: MergeRequest, session: AsyncSession = Depends(get_session)
) -> MergeResponse:
    """Fusionne activity_type_id (supprimé) dans payload.target_id (survivant)."""
    try:
        outcome = await merge_catalogue_entries(
            session,
            item_model=ActivityType,
            alias_model=ActivityAlias,
            alias_fk_name="activity_type_id",
            reference_model=ActivityLog,
            reference_fk_name="activity_type_id",
            source_id=activity_type_id,
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
