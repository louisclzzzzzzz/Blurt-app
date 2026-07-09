from functools import lru_cache

from mistralai.client import Mistral

from app.config import get_settings


@lru_cache
def get_mistral_client() -> Mistral:
    return Mistral(api_key=get_settings().mistral_api_key)
