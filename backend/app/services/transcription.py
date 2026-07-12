import io
import wave
from collections.abc import AsyncIterator

from mistralai.client.models import File
from mistralai.extra.realtime import AudioFormat
from mistralai.extra.realtime.connection import RealtimeEvent

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


# Compromis latence/qualité documenté par Mistral pour la transcription en
# flux continu — cf. DICTEE_LIVE_NUTRITION.md. Ajustable après tests réels,
# même statut empirique que les seuils de confiance dans matching.py.
TARGET_STREAMING_DELAY_MS = 480

# Format attendu par le hook frontend (useLiveCapture) : PCM 16-bit
# little-endian, 16 kHz, mono — cf. DICTEE_LIVE_NUTRITION.md.
REALTIME_AUDIO_FORMAT = AudioFormat(encoding="pcm_s16le", sample_rate=16000)


def stream_realtime_transcription(audio_stream: AsyncIterator[bytes]) -> AsyncIterator[RealtimeEvent]:
    """Relaie un flux audio PCM vers Voxtral Realtime, en flux continu.

    audio_stream : chunks PCM tels que reçus du navigateur (WS /captures/stream).
    Retourne un itérateur asynchrone d'évènements bruts du SDK (segments
    partiels/finalisés, fin de flux, erreurs) — à typer/traiter côté appelant.
    """
    settings = get_settings()
    return get_mistral_client().audio.realtime.transcribe_stream(
        audio_stream,
        model=settings.voxtral_realtime_model,
        audio_format=REALTIME_AUDIO_FORMAT,
        target_streaming_delay_ms=TARGET_STREAMING_DELAY_MS,
    )


def wrap_pcm_as_wav(pcm_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """Encapsule le PCM 16-bit mono brut accumulé pendant une session de dictée
    live dans un conteneur WAV, pour que l'audio archivé (Supabase Storage)
    reste lisible — Voxtral Realtime lui-même consomme le PCM brut sans ce
    conteneur, cet encapsulage n'est utile qu'à l'archivage.
    """
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)
    return buffer.getvalue()
