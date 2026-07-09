"""Estimation des calories dépensées : MET x poids x durée.

1 MET = 1 kcal/kg/heure par définition — c'est la formule standard (Compendium
of Physical Activities), déjà normalisée par kg de poids corporel. Le poids est
donc le facteur biométrique déterminant ; âge/taille/sexe sont collectés dans
le profil utilisateur mais n'entrent pas dans ce calcul (pas de justification
à les y ajouter sans un modèle plus sophistiqué, ex: BMR).
"""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import StrengthExercise
from app.models.profile import UserProfile
from app.models.workout import StrengthSet

# Forfait par série de musculation (travail + repos), faute de durée mesurée
# par set — valeur de départ empirique (cf. NEXT_STEPS.md, affinage ultérieur).
SECONDS_PER_SET_ESTIMATE = 90


def estimate_calories_kcal(
    met_value: float | None, weight_kg: float | None, duration_hours: float | None
) -> float | None:
    if met_value is None or weight_kg is None or duration_hours is None or duration_hours <= 0:
        return None
    return met_value * weight_kg * duration_hours


async def compute_workout_session_calories(
    session: AsyncSession, workout_session_id: uuid.UUID, profile: Optional[UserProfile]
) -> Optional[float]:
    """Somme, par série de la séance, de MET x poids x forfait de durée —
    pas de durée mesurée par set, donc pas de calcul unique "moyenne x durée
    totale" mais une somme série par série (équivalent, et tolère que
    certaines fiches d'exercice n'aient pas encore de met_value : elles sont
    simplement ignorées plutôt que de faire échouer tout le calcul).

    Appelée après tout ajout/édition/suppression de série (pas seulement à la
    création) pour ne jamais coder en dur un couplage à la formule actuelle,
    que la Phase 6 doit pouvoir affiner sans casser cette invariante."""
    if profile is None:
        return None
    met_values = (
        await session.execute(
            select(StrengthExercise.met_value)
            .join(StrengthSet, StrengthSet.exercise_id == StrengthExercise.id)
            .where(StrengthSet.workout_session_id == workout_session_id)
        )
    ).scalars().all()
    known = [m for m in met_values if m is not None]
    if not known:
        return None
    hours_per_set = SECONDS_PER_SET_ESTIMATE / 3600
    return sum(estimate_calories_kcal(met, profile.weight_kg, hours_per_set) or 0.0 for met in known)
