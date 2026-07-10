"""Seed d'un catalogue d'activités cardio/autres avec leur MET (équivalent métabolique).

Sans ce seed, une activité n'existe en base que si un utilisateur l'a déjà
dictée : sa fiche est alors créée à la volée avec un MET *deviné par le LLM*
(cf. app/services/calories.py, app/routers/validation.py) et ce MET n'est
jamais recalculé ensuite. Ce script pré-remplit `activity_types` avec des
valeurs MET réelles issues du Compendium of Physical Activities (Ainsworth et
al., 2011 — référence standard, domaine public dans son usage numérique),
pour que le calcul de calories dépensées (MET x poids x durée) soit fiable
dès la première dictée d'une activité courante, et couvre davantage
d'activités que ce qu'un usage organique aurait fait apparaître.

Chaque entrée est identifiée par son nom EXACT. Si une fiche du même nom
existe déjà (créée via dictée), son met_value est mis à jour vers la valeur
curée ci-dessous plutôt que de dupliquer — voir --apply. Sans --apply : mode
dry-run, affiche juste le rapport (créations/mises à jour prévues).

Usage : uv run python scripts/seed_activities.py [--apply] [--with-embeddings]
Sans --with-embeddings, les nouvelles fiches sont créées avec embedding=NULL
(à calculer plus tard via scripts/backfill_embeddings.py) — les fiches déjà
existantes ne sont jamais réembeddées ici, leur nom ne change pas.
"""

import argparse
import asyncio

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.activity import ActivityType
from app.services.embeddings import embed_texts

# (nom, MET) — valeurs du Compendium of Physical Activities (2011).
ACTIVITIES: list[tuple[str, float]] = [
    # Marche / randonnée
    ("Marche lente (< 4 km/h)", 2.8),
    ("Marche normale (4-5 km/h)", 3.5),
    ("Marche rapide (5.5-6.5 km/h)", 4.3),
    ("Marche très rapide (> 7 km/h)", 5.0),
    ("Marche en côte", 6.0),
    ("Randonnée, terrain plat", 4.3),
    ("Randonnée, montagne avec sac à dos", 7.3),
    ("Montée d'escaliers", 8.8),
    ("Nordic walking (marche nordique)", 5.3),
    # Course à pied
    ("Course à pied, 8 km/h", 8.3),
    ("Course à pied, 9.5 km/h", 9.8),
    ("Course à pied, 10.5 km/h", 10.5),
    ("Course à pied, 11.5 km/h", 11.8),
    ("Course à pied, 12.5 km/h", 12.8),
    ("Course à pied, 14 km/h", 14.5),
    ("Course à pied, 16 km/h", 16.0),
    ("Trail running", 9.0),
    ("Course sur tapis roulant", 9.8),
    # Vélo
    ("Vélo, allure loisir (< 16 km/h)", 4.0),
    ("Vélo, allure modérée (16-19 km/h)", 6.8),
    ("Vélo, allure soutenue (19-22 km/h)", 8.0),
    ("Vélo, allure rapide (22-25 km/h)", 10.0),
    ("Vélo, allure course (> 25 km/h)", 12.0),
    ("VTT", 8.5),
    ("Vélo d'appartement, effort modéré", 6.8),
    ("Vélo d'appartement, effort intense", 10.5),
    ("Vélo électrique", 3.5),
    # Natation
    ("Natation, brasse, loisir", 5.3),
    ("Natation, crawl, effort modéré", 8.3),
    ("Natation, crawl, effort intense", 10.0),
    ("Natation, dos crawlé", 7.0),
    ("Aquagym", 5.5),
    # Sports de raquette / ballon
    ("Tennis, simple", 8.0),
    ("Tennis, double", 6.0),
    ("Badminton", 5.5),
    ("Squash", 7.3),
    ("Padel", 6.0),
    ("Tennis de table", 4.0),
    ("Football", 7.0),
    ("Basketball", 6.5),
    ("Volleyball", 4.0),
    ("Handball", 8.0),
    ("Rugby", 8.3),
    ("Golf, à pied avec chariot", 4.3),
    # Fitness / salle
    ("Rameur (ergomètre), effort modéré", 7.0),
    ("Rameur (ergomètre), effort intense", 8.5),
    ("Vélo elliptique", 5.0),
    ("Corde à sauter", 11.8),
    ("HIIT (entraînement fractionné)", 8.0),
    ("Step / aérobic", 7.3),
    ("Cours de fitness collectif", 6.0),
    ("Gainage / abdominaux", 3.8),
    ("Stretching / étirements", 2.3),
    ("Yoga", 2.5),
    ("Pilates", 3.0),
    # Danse / arts martiaux
    ("Danse, salsa ou rock", 4.5),
    ("Danse classique", 5.0),
    ("Zumba", 6.5),
    ("Boxe, entraînement au sac", 7.8),
    ("Boxe, sparring", 9.0),
    ("Judo / karaté / arts martiaux", 8.3),
    ("Escrime", 6.0),
    # Sports d'extérieur / nature
    ("Ski de piste", 6.0),
    ("Ski de fond", 8.0),
    ("Snowboard", 5.3),
    ("Escalade en salle", 7.5),
    ("Escalade en falaise", 8.0),
    ("Aviron en extérieur", 7.0),
    ("Kayak / canoë", 5.0),
    ("Paddle (SUP)", 6.0),
    ("Patinage à glace", 7.0),
    ("Roller / patins à roulettes", 7.5),
    ("Skateboard", 5.0),
    ("Équitation", 4.0),
    # Quotidien / domestique
    ("Ménage léger", 2.5),
    ("Jardinage", 4.0),
    ("Bricolage", 3.5),
    ("Port de charges (déménagement)", 6.0),
    ("Vélo utilitaire (trajet quotidien)", 5.0),
]


async def apply_activities(dry_run: bool, with_embeddings: bool, batch_size: int = 96) -> None:
    to_create: list[tuple[str, float]] = []
    to_update: list[tuple[ActivityType, float]] = []
    unchanged = 0

    async with async_session_factory() as session:
        for name, met in ACTIVITIES:
            existing = (
                await session.execute(select(ActivityType).where(ActivityType.name == name))
            ).scalar_one_or_none()
            if existing is None:
                to_create.append((name, met))
            elif existing.met_value != met:
                to_update.append((existing, met))
            else:
                unchanged += 1

        if not dry_run:
            for i in range(0, len(to_create), batch_size):
                batch = to_create[i : i + batch_size]
                embeddings: list[list[float]] | None = None
                if with_embeddings:
                    embeddings = await embed_texts([name for name, _ in batch])
                for j, (name, met) in enumerate(batch):
                    session.add(
                        ActivityType(
                            name=name,
                            met_value=met,
                            embedding=embeddings[j] if embeddings else None,
                        )
                    )
            for existing, met in to_update:
                existing.met_value = met
                session.add(existing)
            await session.commit()

    verb = "créées" if not dry_run else "à créer (dry-run)"
    verb_u = "mises à jour" if not dry_run else "à mettre à jour (dry-run)"
    print(f"{len(to_create)} activités {verb}, {len(to_update)} {verb_u}, {unchanged} déjà à jour.")
    if not with_embeddings and to_create:
        print("(embeddings non calculés — pas de clé Mistral fournie ou --with-embeddings omis)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Applique réellement les créations/mises à jour (sinon dry-run)")
    parser.add_argument("--with-embeddings", action="store_true")
    args = parser.parse_args()
    asyncio.run(apply_activities(dry_run=not args.apply, with_embeddings=args.with_embeddings))
