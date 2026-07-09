import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, DateTime, String
from sqlmodel import Field, Relationship

from app.models.base import BaseTable
from app.models.enums import MealType
from app.models.food import FoodItem


class MealEntry(BaseTable, table=True):
    """Un repas dicté, pouvant contenir plusieurs aliments."""

    __tablename__ = "meal_entries"

    logged_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    meal_type: Optional[MealType] = Field(default=None, sa_column=Column(String, nullable=True))
    notes: Optional[str] = None

    consumptions: list["FoodConsumption"] = Relationship(back_populates="meal_entry")


class FoodConsumption(BaseTable, table=True):
    """Une ligne d'aliment consommé dans un repas. Les macros sont figées (snapshot) au moment de la saisie."""

    __tablename__ = "food_consumptions"

    meal_entry_id: uuid.UUID = Field(foreign_key="meal_entries.id", index=True)
    food_item_id: uuid.UUID = Field(foreign_key="food_items.id", index=True)
    quantity_grams: float

    # Snapshot des macros calculées à la quantité loggée : ne doit jamais
    # varier rétroactivement si food_items est corrigé plus tard.
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float

    meal_entry: MealEntry = Relationship(back_populates="consumptions")
    food_item: FoodItem = Relationship()
