import asyncio
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from mistralai.client.models import (
    RealtimeTranscriptionError,
    TranscriptionStreamDone,
    TranscriptionStreamSegmentDelta,
    TranscriptionStreamTextDelta,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app import storage
from app.db.session import get_session
from app.models.enums import CaptureStatus
from app.models.voice_capture import VoiceCapture
from app.services.transcription import stream_realtime_transcription, wrap_pcm_as_wav

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/captures", tags=["capture-stream"])

_END_OF_AUDIO = None  # sentinel poussé dans la queue pour clore proprement le flux audio


@router.websocket("/stream")
async def stream_capture(websocket: WebSocket, session: AsyncSession = Depends(get_session)) -> None:
    """Dictée nutrition en flux continu (pilote, cf. DICTEE_LIVE_NUTRITION.md).

    Phase 7A : relaie la transcription Voxtral Realtime brute au fur et à
    mesure, pas encore d'extraction. Client -> serveur : frames binaires PCM
    (16-bit LE, 16kHz, mono) + un message JSON de contrôle `{"type": "end"}`
    pour signaler la fin de la dictée. Pas de reprise de session après
    coupure réseau (hors périmètre pilote) : une déconnexion met fin à la
    dictée côté serveur, l'audio déjà reçu est tout de même archivé.
    """
    await websocket.accept()

    capture = VoiceCapture(audio_url="streaming-in-progress", status=CaptureStatus.STREAMING)
    session.add(capture)
    await session.commit()
    await session.refresh(capture)
    await websocket.send_json({"type": "capture_created", "capture_id": str(capture.id)})

    audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    audio_chunks: list[bytes] = []

    async def audio_stream() -> AsyncIterator[bytes]:
        while True:
            chunk = await audio_queue.get()
            if chunk is _END_OF_AUDIO:
                return
            yield chunk

    async def forward_transcription() -> None:
        try:
            async for event in stream_realtime_transcription(audio_stream()):
                await _send_event(websocket, event)
                if isinstance(event, TranscriptionStreamDone):
                    # Transcript complet persisté pour l'audit, comme le flux
                    # batch (cf. routers/captures.py::_process_transcript) —
                    # pas encore d'extraction dessus en Phase 7A.
                    capture.transcript_text = event.text
                    session.add(capture)
                    await session.commit()
        except Exception as exc:  # connexion Mistral perdue, erreur SDK, quota...
            logger.exception("Échec de la transcription realtime")
            await _safe_send_json(websocket, {"type": "error", "message": str(exc)})

    forward_task = asyncio.create_task(forward_transcription())

    try:
        while True:
            message = await websocket.receive()
            if message["type"] == "websocket.disconnect":
                break
            data = message.get("bytes")
            if data is not None:
                audio_chunks.append(data)
                await audio_queue.put(data)
                continue
            text = message.get("text")
            if text is not None:
                control = json.loads(text)
                if control.get("type") == "end":
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await audio_queue.put(_END_OF_AUDIO)
        await forward_task

        try:
            audio_bytes = b"".join(audio_chunks)
            if audio_bytes:
                wav_bytes = wrap_pcm_as_wav(audio_bytes)
                capture.audio_url = await storage.upload_audio(wav_bytes, content_type="audio/wav")
            capture.status = CaptureStatus.PENDING_VALIDATION
            session.add(capture)
            await session.commit()
            await _safe_send_json(websocket, {"type": "stream_ended", "capture_id": str(capture.id)})
        except Exception:
            logger.exception("Échec de la finalisation de la capture streaming %s", capture.id)

        try:
            await websocket.close()
        except RuntimeError:
            pass  # déjà fermé côté client


async def _send_event(websocket: WebSocket, event: Any) -> None:
    if isinstance(event, TranscriptionStreamTextDelta):
        await _safe_send_json(websocket, {"type": "transcript_partial", "text": event.text})
    elif isinstance(event, TranscriptionStreamSegmentDelta):
        await _safe_send_json(
            websocket,
            {"type": "transcript_segment", "text": event.text, "start": event.start, "end": event.end},
        )
    elif isinstance(event, TranscriptionStreamDone):
        await _safe_send_json(websocket, {"type": "transcript_done", "text": event.text})
    elif isinstance(event, RealtimeTranscriptionError):
        await _safe_send_json(websocket, {"type": "error", "message": str(event)})
    # TranscriptionStreamLanguage / UnknownRealtimeEvent : ignorés en 7A, pas
    # d'usage frontend pour l'instant.


async def _safe_send_json(websocket: WebSocket, payload: dict) -> None:
    # Best-effort : le client peut s'être déconnecté à tout moment pendant
    # qu'un évènement de transcription était en cours de traitement
    # (WebSocketDisconnect côté Starlette, RuntimeError si le socket est déjà
    # fermé localement) — jamais une raison de faire planter la tâche.
    try:
        await websocket.send_json(payload)
    except (RuntimeError, WebSocketDisconnect):
        pass
