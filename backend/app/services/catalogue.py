import uuid
from dataclasses import dataclass
from typing import Optional, TypeVar

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import SQLModel

# Seuil de similarité pg_trgm en dessous duquel un résultat n'est plus pertinent
# — repris tel quel depuis routers/foods.py (Phase 1), désormais partagé par
# les 3 catalogues (aliments/exercices/activités).
MIN_TRIGRAM_SIMILARITY = 0.15

ItemT = TypeVar("ItemT", bound=SQLModel)


async def search_catalogue(
    session: AsyncSession,
    item_model: type[ItemT],
    query: Optional[str],
    limit: int,
    *,
    extra_filter=None,
) -> list[ItemT]:
    """Recherche floue par nom (pg_trgm). Sans `query`, liste par ordre alphabétique.

    `extra_filter` (clause SQLAlchemy optionnelle) restreint davantage le
    résultat — utilisé par /foods pour distinguer aliments Ciqual/créés, sans
    rien changer pour les appelants exercices/activités qui ne le passent pas.
    """
    if query:
        similarity = func.similarity(item_model.name, query)
        stmt = (
            select(item_model)
            .where(similarity > MIN_TRIGRAM_SIMILARITY)
            .order_by(similarity.desc())
            .limit(limit)
        )
    else:
        stmt = select(item_model).order_by(item_model.name).limit(limit)
    if extra_filter is not None:
        stmt = stmt.where(extra_filter)
    return list((await session.execute(stmt)).scalars().all())


async def get_catalogue_entry_with_aliases(
    session: AsyncSession, item_model: type[ItemT], item_id: uuid.UUID
) -> Optional[ItemT]:
    """Charge une fiche avec ses alias déjà chargés (selectinload) — nécessaire pour
    sérialiser un *DetailRead sans déclencher de lazy-load implicite en session async."""
    stmt = select(item_model).where(item_model.id == item_id).options(selectinload(item_model.aliases))
    return (await session.execute(stmt)).scalar_one_or_none()


@dataclass
class MergeOutcome:
    merged_alias_count: int
    reassigned_reference_count: int


async def merge_catalogue_entries(
    session: AsyncSession,
    *,
    item_model: type[SQLModel],
    alias_model: type[SQLModel],
    alias_fk_name: str,
    reference_model: type[SQLModel],
    reference_fk_name: str,
    source_id: uuid.UUID,
    target_id: uuid.UUID,
) -> MergeOutcome:
    """Fusionne source_id dans target_id : source_id est supprimé, target_id absorbe
    ses alias (sans doublon, silencieusement ignorés plutôt que de faire échouer
    toute la fusion) et toutes les lignes qui le référencent (réassignation en masse).

    Pas de recalcul rétroactif des calories historiques (WorkoutSession/ActivityLog)
    même si source et target ont des met_value différents — cohérent avec la
    philosophie "snapshot ne bouge jamais" déjà appliquée à FoodConsumption.
    """
    if source_id == target_id:
        raise ValueError("Impossible de fusionner une fiche avec elle-même")

    source = await session.get(item_model, source_id)
    target = await session.get(item_model, target_id)
    if source is None or target is None:
        raise LookupError("Fiche source ou cible introuvable")

    existing_alias_texts = {
        a.alias_text.lower()
        for a in (
            await session.execute(
                select(alias_model).where(getattr(alias_model, alias_fk_name) == target_id)
            )
        ).scalars()
    }
    moved = 0
    for alias in (
        await session.execute(select(alias_model).where(getattr(alias_model, alias_fk_name) == source_id))
    ).scalars():
        if alias.alias_text.lower() in existing_alias_texts:
            await session.delete(alias)
        else:
            setattr(alias, alias_fk_name, target_id)
            existing_alias_texts.add(alias.alias_text.lower())
            moved += 1

    result = await session.execute(
        update(reference_model)
        .where(getattr(reference_model, reference_fk_name) == source_id)
        .values(**{reference_fk_name: target_id})
    )

    await session.delete(source)
    return MergeOutcome(merged_alias_count=moved, reassigned_reference_count=result.rowcount)
