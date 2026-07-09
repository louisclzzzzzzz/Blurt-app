"""Calcule les embeddings mistral-embed manquants sur food_items (embedding IS NULL).

À lancer une fois une clé Mistral valide renseignée dans .env, après un import
initial fait sans --with-embeddings (cf. import_ciqual.py).

Usage : uv run python scripts/backfill_embeddings.py
"""

import asyncio

from sqlalchemy import select

from app.db.session import async_session_factory
from app.models.food import FoodItem
from app.services.embeddings import embed_texts

BATCH_SIZE = 96


async def main() -> None:
    async with async_session_factory() as session:
        result = await session.execute(
            select(FoodItem).where(FoodItem.embedding.is_(None)).order_by(FoodItem.name)
        )
        foods = list(result.scalars().all())
        print(f"{len(foods)} aliments sans embedding.")
        for i in range(0, len(foods), BATCH_SIZE):
            batch = foods[i : i + BATCH_SIZE]
            embeddings = await embed_texts([f.name for f in batch])
            for food, embedding in zip(batch, embeddings):
                food.embedding = embedding
                session.add(food)
            await session.commit()
            print(f"  {min(i + BATCH_SIZE, len(foods))}/{len(foods)} calculés")
    print("Backfill terminé.")


if __name__ == "__main__":
    asyncio.run(main())
