import uuid

import httpx

from app.config import get_settings

EXTENSION_BY_CONTENT_TYPE = {
    "audio/webm": "webm",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
}


def _headers() -> dict[str, str]:
    key = get_settings().supabase_service_role_key
    return {"Authorization": f"Bearer {key}", "apikey": key}


async def upload_audio(audio_bytes: bytes, content_type: str = "audio/webm") -> str:
    """Upload un enregistrement audio vers le bucket Supabase Storage configuré.

    Appel direct à l'API REST Storage (pas le SDK supabase-py, cohérent avec
    le choix du projet de connexion directe à la base). Retourne le chemin
    de stockage (pas une URL publique : le bucket est privé).
    """
    settings = get_settings()
    extension = EXTENSION_BY_CONTENT_TYPE.get(content_type, "bin")
    path = f"{uuid.uuid4()}.{extension}"
    url = f"{settings.supabase_url}/storage/v1/object/{settings.supabase_storage_bucket}/{path}"
    headers = {**_headers(), "Content-Type": content_type}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, content=audio_bytes)
        response.raise_for_status()
    return path


async def get_signed_url(path: str, expires_in: int = 3600) -> str:
    """Génère une URL signée temporaire pour ré-écouter un audio (le bucket est privé)."""
    settings = get_settings()
    url = f"{settings.supabase_url}/storage/v1/object/sign/{settings.supabase_storage_bucket}/{path}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, headers=_headers(), json={"expiresIn": expires_in})
        response.raise_for_status()
        data = response.json()
    return f"{settings.supabase_url}/storage/v1{data['signedURL']}"
