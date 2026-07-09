import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.exercise import ExerciseAlias, StrengthExercise
from app.models.workout import StrengthSet
from app.schemas.catalogue import (
    ExerciseDetailRead,
    ExerciseRead,
    MergeRequest,
    MergeResponse,
    UpdateExerciseRequest,
)
from app.services.catalogue import get_catalogue_entry_with_aliases, merge_catalogue_entries, search_catalogue
from app.services.embeddings import embed_texts

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
async def search_exercises(
    query: str | None = Query(None, description="Recherche floue par nom (pg_trgm)"),
    limit: int = Query(20, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[StrengthExercise]:
    """Recherche d'exercices par nom. Sans `query`, liste par ordre alphabétique."""
    return await search_catalogue(session, StrengthExercise, query, limit)


@router.get("/{exercise_id}", response_model=ExerciseDetailRead)
async def get_exercise(
    exercise_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> StrengthExercise:
    exercise = await get_catalogue_entry_with_aliases(session, StrengthExercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercice introuvable")
    return exercise


@router.patch("/{exercise_id}", response_model=ExerciseDetailRead)
async def update_exercise(
    exercise_id: uuid.UUID, payload: UpdateExerciseRequest, session: AsyncSession = Depends(get_session)
) -> StrengthExercise:
    exercise = await session.get(StrengthExercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercice introuvable")

    changes = payload.model_dump(exclude_unset=True)
    name_changed = "name" in changes and changes["name"] != exercise.name
    for field, value in changes.items():
        setattr(exercise, field, value)

    if name_changed:
        [embedding] = await embed_texts([exercise.name])
        exercise.embedding = embedding

    session.add(exercise)
    await session.commit()

    updated = await get_catalogue_entry_with_aliases(session, StrengthExercise, exercise_id)
    assert updated is not None
    return updated


@router.delete("/{exercise_id}/aliases/{alias_id}", status_code=204)
async def delete_exercise_alias(
    exercise_id: uuid.UUID, alias_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    alias = await session.get(ExerciseAlias, alias_id)
    if alias is None or alias.exercise_id != exercise_id:
        raise HTTPException(status_code=404, detail="Alias introuvable")
    await session.delete(alias)
    await session.commit()


@router.post("/{exercise_id}/merge", response_model=MergeResponse)
async def merge_exercises(
    exercise_id: uuid.UUID, payload: MergeRequest, session: AsyncSession = Depends(get_session)
) -> MergeResponse:
    """Fusionne exercise_id (supprimé) dans payload.target_id (survivant)."""
    try:
        outcome = await merge_catalogue_entries(
            session,
            item_model=StrengthExercise,
            alias_model=ExerciseAlias,
            alias_fk_name="exercise_id",
            reference_model=StrengthSet,
            reference_fk_name="exercise_id",
            source_id=exercise_id,
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
