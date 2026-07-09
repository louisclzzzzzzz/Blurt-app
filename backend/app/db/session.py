from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# Connexion directe au Postgres Supabase (pas de pooler PgBouncer/Supavisor) :
# le backend tourne comme un process persistant (conteneur long-lived), donc
# aucun souci de compatibilité prepared statements en mode transaction.
engine = create_async_engine(settings.database_url, pool_pre_ping=True)

async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session
