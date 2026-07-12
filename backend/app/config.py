from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Connexion directe Postgres (Supabase), pas via supabase-py.
    # Format: postgresql+asyncpg://postgres:[password]@[host]:5432/postgres
    database_url: str

    mistral_api_key: str
    voxtral_model: str = "voxtral-mini-latest"
    voxtral_realtime_model: str = "voxtral-mini-transcribe-realtime-2602"
    mistral_extraction_model: str = "mistral-large-latest"
    mistral_embed_model: str = "mistral-embed"

    # Supabase Storage (audio brut), accédé en direct via l'API S3-compatible
    # (pas via supabase-py), avec la clé service_role.
    supabase_url: str
    supabase_service_role_key: str
    supabase_storage_bucket: str = "voice-captures"

    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
