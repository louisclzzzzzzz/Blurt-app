import uuid
from dataclasses import dataclass
from enum import StrEnum
from typing import Generic, TypeVar

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from app.models.activity import ActivityAlias, ActivityType
from app.models.exercise import ExerciseAlias, StrengthExercise
from app.models.food import FoodAlias, FoodItem
from app.services.embeddings import embed_texts

# Seuils de confiance — valeurs de départ empiriques (cf. plan, Phase 6 pour
# l'affinage à partir de l'usage réel), pas de calibration scientifique.
HIGH_CONFIDENCE = 0.90
LOW_CONFIDENCE = 0.60
TOP_K = 5


class MatchConfidence(StrEnum):
    HIGH = "high"  # auto-match, aucune question posée
    AMBIGUOUS = "ambiguous"  # candidat(s) plausibles mais confirmation nécessaire
    NONE = "none"  # aucun candidat plausible


ItemT = TypeVar("ItemT", bound=SQLModel)


@dataclass
class Candidate(Generic[ItemT]):
    item: ItemT
    score: float


@dataclass
class MatchResult(Generic[ItemT]):
    confidence: MatchConfidence
    candidates: list[Candidate[ItemT]]  # triés par score décroissant

    @property
    def best(self) -> ItemT | None:
        return self.candidates[0].item if self.candidates else None


async def _hybrid_match(
    session: AsyncSession,
    spoken_name: str,
    item_model: type[ItemT],
    alias_model: type[SQLModel],
    alias_fk: ColumnElement,
) -> MatchResult[ItemT]:
    """Cœur du matching hybride pg_trgm + pgvector, partagé entre aliments, exercices
    et activités — seule la logique de fallback spécifique (Open Food Facts,
    auto-création...) reste dans les fonctions appelantes.

    1. Alias appris ou nom canonique identique -> confiance maximale immédiate.
    2. Sinon, combine similarité trigram (nom) et cosinus (embedding), en
       prenant le meilleur des deux signaux par candidat plutôt qu'une
       moyenne qui dilue un signal fort avec un signal faible.
    """
    alias_stmt = (
        select(item_model)
        .join(alias_model, alias_fk == item_model.id)
        .where(func.lower(alias_model.alias_text) == spoken_name.lower())
        .limit(1)
    )
    exact = (await session.execute(alias_stmt)).scalar_one_or_none()
    if exact is None:
        name_stmt = select(item_model).where(func.lower(item_model.name) == spoken_name.lower()).limit(1)
        exact = (await session.execute(name_stmt)).scalar_one_or_none()
    if exact is not None:
        return MatchResult(confidence=MatchConfidence.HIGH, candidates=[Candidate(exact, 1.0)])

    [query_embedding] = await embed_texts([spoken_name])

    trigram_similarity = func.similarity(item_model.name, spoken_name)
    trigram_rows = (
        await session.execute(
            select(item_model, trigram_similarity.label("score"))
            .order_by(trigram_similarity.desc())
            .limit(TOP_K)
        )
    ).all()

    embedding_distance = item_model.embedding.cosine_distance(query_embedding)
    embedding_rows = (
        await session.execute(
            select(item_model, embedding_distance.label("distance"))
            .where(item_model.embedding.is_not(None))
            .order_by(embedding_distance)
            .limit(TOP_K)
        )
    ).all()

    scores: dict[uuid.UUID, float] = {}
    entities: dict[uuid.UUID, ItemT] = {}
    for entity, trigram_score in trigram_rows:
        entities[entity.id] = entity
        scores[entity.id] = max(scores.get(entity.id, 0.0), float(trigram_score))
    for entity, distance in embedding_rows:
        embedding_score = max(0.0, 1.0 - float(distance))
        entities[entity.id] = entity
        scores[entity.id] = max(scores.get(entity.id, 0.0), embedding_score)

    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    candidates = [Candidate(entities[entity_id], score) for entity_id, score in ranked]

    if not candidates:
        return MatchResult(confidence=MatchConfidence.NONE, candidates=[])

    top_score = candidates[0].score
    if top_score >= HIGH_CONFIDENCE:
        # Toujours ambigu si un deuxième candidat est presque aussi bon que le premier.
        if len(candidates) > 1 and candidates[1].score >= top_score - 0.05:
            return MatchResult(confidence=MatchConfidence.AMBIGUOUS, candidates=candidates[:TOP_K])
        return MatchResult(confidence=MatchConfidence.HIGH, candidates=candidates[:1])
    if top_score >= LOW_CONFIDENCE:
        return MatchResult(confidence=MatchConfidence.AMBIGUOUS, candidates=candidates[:TOP_K])
    return MatchResult(confidence=MatchConfidence.NONE, candidates=[])


async def match_food(session: AsyncSession, spoken_name: str) -> MatchResult[FoodItem]:
    return await _hybrid_match(session, spoken_name, FoodItem, FoodAlias, FoodAlias.food_item_id)


async def match_exercise(session: AsyncSession, spoken_name: str) -> MatchResult[StrengthExercise]:
    return await _hybrid_match(
        session, spoken_name, StrengthExercise, ExerciseAlias, ExerciseAlias.exercise_id
    )


async def match_activity(session: AsyncSession, spoken_name: str) -> MatchResult[ActivityType]:
    return await _hybrid_match(
        session, spoken_name, ActivityType, ActivityAlias, ActivityAlias.activity_type_id
    )
