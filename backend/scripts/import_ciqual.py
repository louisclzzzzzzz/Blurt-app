"""Importe la table Ciqual (ANSES) dans food_items.

Source : https://entrepot.recherche.data.gouv.fr/dataset.xhtml?persistentId=doi:10.57745/RDMHWY
Licence Ouverte / Etalab — citer "Anses. 2025. Table Ciqual 2025" en cas de réutilisation.

Usage :
    uv run python scripts/import_ciqual.py [--file PATH] [--with-embeddings] [--force]

Sans --with-embeddings, les aliments sont importés avec embedding=NULL (à
calculer plus tard via scripts/backfill_embeddings.py une fois une clé
Mistral disponible) — la recherche par nom reste utilisable entre-temps.
"""

import argparse
import asyncio
from pathlib import Path

import openpyxl
from sqlalchemy import delete, func, select

from app.db.session import async_session_factory
from app.models.enums import FoodSource
from app.models.food import FoodItem
from app.services.embeddings import embed_texts

SHEET_NAME = "composition nutritionnelle"

COL = {
    "ciqual_code": 6,
    "name": 7,
    "energy_kcal": 10,
    "protein_g": 14,
    "carbs_g": 16,
    "fat_g": 17,
    "sugars_g": 18,
    "fiber_g": 26,
    "saturated_fat_g": 31,
    "salt_g": 49,
}
REQUIRED_FIELDS = ["energy_kcal", "protein_g", "carbs_g", "fat_g"]
VALUE_FIELDS = [k for k in COL if k not in ("ciqual_code", "name")]


def parse_value(raw: object) -> float | None:
    """Convertit une cellule Ciqual en float, ou None si non déterminée.

    Conventions Ciqual : "-" = non déterminé, "traces" = quantité négligeable
    (traité comme 0), "< X" = notation de seuil (on retient X, une légère
    surestimation acceptable pour du suivi nutritionnel).
    """
    if raw is None:
        return None
    if isinstance(raw, (int, float)):
        return float(raw)
    text = str(raw).strip().replace("\xa0", " ").strip()
    if text in ("-", ""):
        return None
    if text.lower() == "traces":
        return 0.0
    if text.startswith("<"):
        text = text[1:].strip()
    try:
        return float(text.replace(",", "."))
    except ValueError:
        return None


def clean_name(raw: object) -> str:
    return " ".join(str(raw).split())


def parse_ciqual_rows(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    try:
        ws = wb[SHEET_NAME]
        rows = ws.iter_rows(values_only=True)
        next(rows)  # en-tête

        foods = []
        skipped = 0
        for row in rows:
            code = row[COL["ciqual_code"]]
            name = row[COL["name"]]
            if not code or not name:
                continue
            values = {key: parse_value(row[COL[key]]) for key in VALUE_FIELDS}
            if any(values[key] is None for key in REQUIRED_FIELDS):
                skipped += 1
                continue
            foods.append(
                {"ciqual_code": str(code), "name": clean_name(name), **values}
            )
        print(f"{len(foods)} aliments avec macros complètes, {skipped} ignorés (macro de base manquante).")
        return foods
    finally:
        wb.close()


async def import_foods(foods: list[dict], with_embeddings: bool, batch_size: int = 96) -> None:
    async with async_session_factory() as session:
        for i in range(0, len(foods), batch_size):
            batch = foods[i : i + batch_size]
            embeddings: list[list[float]] | None = None
            if with_embeddings:
                embeddings = await embed_texts([f["name"] for f in batch])
            for j, data in enumerate(batch):
                session.add(
                    FoodItem(
                        source=FoodSource.CIQUAL,
                        is_packaged=False,
                        embedding=embeddings[j] if embeddings else None,
                        **data,
                    )
                )
            await session.commit()
            print(f"  {min(i + batch_size, len(foods))}/{len(foods)} importés")


async def existing_ciqual_count() -> int:
    async with async_session_factory() as session:
        result = await session.execute(
            select(func.count()).select_from(FoodItem).where(FoodItem.source == FoodSource.CIQUAL)
        )
        return result.scalar_one()


async def clear_existing_ciqual() -> None:
    async with async_session_factory() as session:
        await session.execute(delete(FoodItem).where(FoodItem.source == FoodSource.CIQUAL))
        await session.commit()


async def main(file_path: Path, with_embeddings: bool, force: bool) -> None:
    existing = await existing_ciqual_count()
    if existing and not force:
        print(
            f"{existing} aliments Ciqual déjà en base. Relancer avec --force pour "
            "les supprimer et réimporter (ex: nouvelle version de la table)."
        )
        return
    if existing and force:
        print(f"Suppression des {existing} aliments Ciqual existants...")
        await clear_existing_ciqual()

    foods = parse_ciqual_rows(file_path)
    if not with_embeddings:
        print("(embeddings non calculés — pas de clé Mistral fournie ou --with-embeddings omis)")
    await import_foods(foods, with_embeddings=with_embeddings)
    print("Import terminé.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--file", type=Path, default=Path(__file__).parent / "data" / "ciqual_2025.xlsx"
    )
    parser.add_argument("--with-embeddings", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(args.file, with_embeddings=args.with_embeddings, force=args.force))
