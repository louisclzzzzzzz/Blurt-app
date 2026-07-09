"""Seed d'une table de portions usuelles pour les aliments Ciqual les plus courants.

Ciqual ne fournit pas de poids par portion (uniquement des valeurs pour 100g) :
cette liste est curée manuellement (~50 aliments de base les plus fréquents),
à faire grandir dans le temps. Pour un aliment sans portion usuelle connue,
le pipeline de matching (Phase 2) devra demander confirmation du poids plutôt
que de deviner — cf. plan du projet.

Chaque entrée est recherchée par nom EXACT dans food_items (source=ciqual)
pour éviter tout risque d'ambiguïté. Une entrée qui ne trouve aucune ligne
(nom Ciqual différent d'une année sur l'autre) ou plusieurs lignes est
signalée sans être appliquée.

Usage : uv run python scripts/seed_portions.py [--apply]
Sans --apply : mode dry-run, affiche juste le rapport de correspondance.
"""

import argparse
import asyncio

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.enums import FoodSource
from app.models.food import FoodItem

# (nom exact Ciqual, libellé de portion, poids en grammes)
PORTIONS: list[tuple[str, str, float]] = [
    # Fruits
    ("Pomme, chair et peau, crue", "1 pomme", 180),
    # L'alias "pomme" appris en Phase 2 pointe vers cette entrée "aliment
    # moyen" (matchée en priorité pour un nom générique), pas vers la
    # précédente : sans portion ici, "deux pommes" tombait en confirmation
    # de poids malgré une portion connue par ailleurs. Trouvé en pratique.
    ("Pomme, chair sans peau, crue (aliment moyen)", "1 pomme", 180),
    ("Poire, chair, crue (aliment moyen)", "1 poire", 170),
    ("Banane, chair sans peau, crue", "1 banane", 120),
    ("Orange, chair sans peau, sans pépins, crue", "1 orange", 130),
    ("Kiwi, chair sans peau, avec pépins, cru", "1 kiwi", 70),
    ("Clémentine ou mandarine, chair sans peau, sans pépins, crue", "1 clémentine", 50),
    ("Avocat, chair sans peau, sans noyau, cru", "1 avocat", 150),
    ("Citron, chair sans peau, sans pépins, cru", "1 citron", 60),
    ("Fraise, crue", "1 fraise", 12),
    ("Pêche, chair sans peau, sans noyau, crue (aliment moyen)", "1 pêche", 150),
    ("Abricot, dénoyauté, cru", "1 abricot", 45),
    ("Prune, sans noyau, crue", "1 prune", 40),
    ("Mangue, chair sans peau, sans noyau, crue", "1 mangue", 300),
    ("Pomelo (dit Pamplemousse), chair sans peau, sans pépins, cru", "1 pamplemousse", 250),
    # Légumes
    ("Tomate sans précision, crue (aliment moyen)", "1 tomate", 120),
    ("Carotte, crue", "1 carotte", 80),
    ("Concombre, chair et peau, cru", "1 concombre", 300),
    ("Pomme de terre, sans peau, crue", "1 pomme de terre", 150),
    ("Oignon, cru", "1 oignon", 100),
    ("Courgette, chair et peau, crue", "1 courgette", 200),
    ("Aubergine, crue", "1 aubergine", 250),
    ("Poivron, vert, jaune ou rouge, cru", "1 poivron", 150),
    # Produits laitiers / oeufs
    ("Yaourt ou lait fermenté, nature", "1 yaourt nature", 125),
    ("Fromage blanc, nature ou aux fruits (aliment moyen)", "1 pot de fromage blanc", 100),
    ("Oeuf, blanc (blanc d'oeuf), cru", "1 blanc d'oeuf", 33),
    ("Oeuf, jaune (jaune d'oeuf), cru", "1 jaune d'oeuf", 17),
    # Pain
    ("Pain blanc (par ex. : baguette, boule…)", "1 tranche de pain", 30),
    ("Pain de mie blanc, préemballé", "1 tranche de pain de mie", 25),
    ("Pain de campagne", "1 tranche de pain de campagne", 40),
    ("Pain complet ou intégral (à la farine T150)", "1 tranche de pain complet", 30),
]


async def apply_portions(dry_run: bool) -> None:
    found, ambiguous, missing = 0, [], []
    async with async_session_factory() as session:
        for name, label, grams in PORTIONS:
            result = await session.execute(
                select(FoodItem).where(
                    FoodItem.source == FoodSource.CIQUAL, FoodItem.name == name
                )
            )
            matches = result.scalars().all()
            if len(matches) == 0:
                missing.append(name)
                continue
            if len(matches) > 1:
                ambiguous.append(name)
                continue
            found += 1
            if not dry_run:
                matches[0].default_portion_label = label
                matches[0].default_portion_grams = grams
                session.add(matches[0])
        if not dry_run:
            await session.commit()

    print(f"{found}/{len(PORTIONS)} portions {'appliquées' if not dry_run else 'trouvées (dry-run)'}.")
    if ambiguous:
        print(f"AMBIGU ({len(ambiguous)}) — plusieurs aliments avec ce nom exact :")
        for name in ambiguous:
            print("  -", name)
    if missing:
        print(f"INTROUVABLE ({len(missing)}) — nom absent de food_items, à corriger dans PORTIONS :")
        for name in missing:
            print("  -", name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Applique réellement les mises à jour (sinon dry-run)")
    args = parser.parse_args()
    asyncio.run(apply_portions(dry_run=not args.apply))
