import uuid
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, String
from sqlmodel import Field, Relationship

from app.models.base import BaseTable
from app.models.enums import FoodSource

EMBEDDING_DIM = 1024


class FoodItem(BaseTable, table=True):
    """Catalogue d'aliments : aliments de base (Ciqual) et produits emballés (OFF ou dictés par l'utilisateur)."""

    __tablename__ = "food_items"

    name: str = Field(index=True)
    # Stocké en VARCHAR simple (pas un ENUM Postgres natif) pour pouvoir
    # ajouter de nouvelles valeurs sans migration de type de colonne.
    source: FoodSource = Field(sa_column=Column(String, nullable=False))
    is_packaged: bool = False
    brand: Optional[str] = None
    ciqual_code: Optional[str] = Field(default=None, index=True)
    off_barcode: Optional[str] = Field(default=None, index=True)

    # Macros pour 100g — toujours normalisées à 100g quelle que soit la
    # quantité dictée à l'origine, pour un calcul homogène par la suite.
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    saturated_fat_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    salt_g: Optional[float] = None

    # Portion usuelle si connue (ex: "1 pomme" -> 180g). Si None, une
    # quantité dictée sans poids explicite doit déclencher une confirmation.
    default_portion_label: Optional[str] = None
    default_portion_grams: Optional[float] = None

    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    aliases: list["FoodAlias"] = Relationship(back_populates="food_item")


class FoodAlias(BaseTable, table=True):
    """Variante dictée d'un aliment, apprise à chaque confirmation utilisateur pour améliorer le matching futur."""

    __tablename__ = "food_aliases"

    food_item_id: uuid.UUID = Field(foreign_key="food_items.id", index=True)
    alias_text: str = Field(index=True)
    embedding: Optional[list[float]] = Field(default=None, sa_column=Column(Vector(EMBEDDING_DIM)))

    food_item: FoodItem = Relationship(back_populates="aliases")
