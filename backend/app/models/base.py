import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BaseTable(SQLModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    # sa_type (pas sa_column=Column(...)) : ce mixin est hérité par toutes les
    # tables, et un Column() déjà instancié ne peut être attaché qu'à une
    # seule Table — sa_type laisse SQLModel construire une colonne fraîche
    # par sous-classe. Toujours "with time zone" : nos valeurs Python sont
    # tz-aware (UTC), et asyncpg refuse de binder un datetime aware sur une
    # colonne DATETIME naive (le défaut si on avait juste annoté `datetime`).
    created_at: datetime = Field(
        default_factory=utcnow, sa_type=DateTime(timezone=True), nullable=False
    )
