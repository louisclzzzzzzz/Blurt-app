from mistralai.client.models import File

from app.config import get_settings
from app.services.mistral_client import get_mistral_client


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "capture.webm",
    context_bias: list[str] | None = None,
) -> str:
    """Transcrit un enregistrement audio en texte via Voxtral.

    context_bias : jusqu'à 100 termes (noms d'aliments/exercices déjà connus
    de l'utilisateur) pour biaiser la reconnaissance vers son vocabulaire
    personnel — cf. plan, Phase 2.
    """
    settings = get_settings()
    response = await get_mistral_client().audio.transcriptions.complete_async(
        model=settings.voxtral_model,
        file=File(file_name=filename, content=audio_bytes),
        context_bias=context_bias,
    )
    return response.text
