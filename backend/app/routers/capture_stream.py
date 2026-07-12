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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import storage
from app.db.session import get_session
from app.models.base import utcnow
from app.models.capture_draft_item import CaptureDraftItem
from app.models.enums import CaptureStatus, DraftItemStatus
from app.models.voice_capture import VoiceCapture
from app.schemas.extraction import DraftItemContext, DraftOperations, ExtractedFood
from app.services.extraction import extract_operations
from app.services.transcription import stream_realtime_transcription, wrap_pcm_as_wav

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/captures", tags=["capture-stream"])

_END_OF_AUDIO = None  # sentinel poussé dans la queue pour clore proprement le flux audio

# Un segment "naturel" se termine sur une ponctuation de fin de phrase, ou
# après un silence assez long pour supposer que la phrase est finie (aucun
# transcription.segment fiable côté Voxtral Realtime pour une dictée
# mono-locuteur — cf. constat Phase 7A, DICTEE_LIVE_NUTRITION.md).
SEGMENT_INACTIVITY_TIMEOUT_S = 0.8
SENTENCE_END_CHARS = (".", "!", "?")


@router.websocket("/stream")
async def stream_capture(websocket: WebSocket, session: AsyncSession = Depends(get_session)) -> None:
    """Dictée nutrition en flux continu (pilote, cf. DICTEE_LIVE_NUTRITION.md).

    Phase 7B : en plus de la transcription brute (7A), chaque segment naturel
    déclenche une extraction incrémentale (add/modify/remove) écrite dans
    capture_draft_items et poussée au client. Pas encore de matching
    catalogue (Phase 7C). Client -> serveur : frames binaires PCM (16-bit LE,
    16kHz, mono) + un message JSON de contrôle `{"type": "end"}` pour
    signaler la fin de la dictée. Pas de reprise de session après coupure
    réseau (hors périmètre pilote) : une déconnexion met fin à la dictée
    côté serveur, l'audio déjà reçu est tout de même archivé.
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
        pending_text = ""
        events = stream_realtime_transcription(audio_stream()).__aiter__()
        try:
            while True:
                try:
                    event = await asyncio.wait_for(
                        events.__anext__(), timeout=SEGMENT_INACTIVITY_TIMEOUT_S
                    )
                except asyncio.TimeoutError:
                    if pending_text.strip():
                        await _handle_segment(session, capture, websocket, pending_text)
                        pending_text = ""
                    continue
                except StopAsyncIteration:
                    break

                await _send_event(websocket, event)

                if isinstance(event, TranscriptionStreamTextDelta):
                    pending_text += event.text
                    if pending_text.rstrip().endswith(SENTENCE_END_CHARS):
                        await _handle_segment(session, capture, websocket, pending_text)
                        pending_text = ""
                elif isinstance(event, TranscriptionStreamDone):
                    if pending_text.strip():
                        await _handle_segment(session, capture, websocket, pending_text)
                        pending_text = ""
                    # Transcript complet persisté pour l'audit, comme le flux
                    # batch (cf. routers/captures.py::_process_transcript).
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


async def _handle_segment(
    session: AsyncSession, capture: VoiceCapture, websocket: WebSocket, segment_text: str
) -> None:
    """Diffe un segment de transcription contre le brouillon actif et
    applique les opérations retournées (add/modify/remove) — cf. plan Phase 7B."""
    active_rows = (
        (
            await session.execute(
                select(CaptureDraftItem)
                .where(
                    CaptureDraftItem.capture_id == capture.id,
                    CaptureDraftItem.status == DraftItemStatus.ACTIVE,
                )
                .order_by(CaptureDraftItem.created_at)
            )
        )
        .scalars()
        .all()
    )
    active_by_id = {str(row.id): row for row in active_rows}
    context = [
        DraftItemContext(
            item_id=str(row.id),
            spoken_name=row.spoken_name,
            quantity_grams=row.quantity_grams,
            quantity_units=row.quantity_units,
            quantity_description=row.quantity_description,
        )
        for row in active_rows
    ]

    try:
        result: DraftOperations = await extract_operations(segment_text, context)
    except Exception:
        logger.exception("Échec de l'extraction d'opérations sur le segment %r", segment_text)
        return

    for operation in result.operations:
        if operation.operation == "add":
            if operation.item is None:
                continue
            row = CaptureDraftItem(capture_id=capture.id, **_draft_fields_from_item(operation.item))
            session.add(row)
            await session.flush()
            await session.refresh(row)
            await _safe_send_json(
                websocket, {"type": "draft_item_added", "item": _serialize_draft_item(row)}
            )

        elif operation.operation == "modify":
            row = active_by_id.get(operation.target_item_id or "")
            if row is None or operation.item is None:
                continue
            _apply_modify(row, operation.item)
            row.updated_at = utcnow()
            session.add(row)
            await session.flush()
            await _safe_send_json(
                websocket, {"type": "draft_item_updated", "item": _serialize_draft_item(row)}
            )

        elif operation.operation == "remove":
            row = active_by_id.get(operation.target_item_id or "")
            if row is None:
                continue
            row.status = DraftItemStatus.REMOVED
            row.updated_at = utcnow()
            session.add(row)
            await session.flush()
            await _safe_send_json(websocket, {"type": "draft_item_removed", "item_id": str(row.id)})

    await session.commit()


def _draft_fields_from_item(item: ExtractedFood) -> dict[str, Any]:
    return {
        "spoken_name": item.spoken_name,
        "quantity_grams": item.quantity_grams,
        "quantity_units": item.quantity_units,
        "quantity_description": item.quantity_description,
        "is_packaged_product": item.is_packaged_product,
        "dictated_macros": (
            item.dictated_macros.normalized_to_100g().model_dump(mode="json")
            if item.dictated_macros
            else None
        ),
    }


def _apply_modify(row: CaptureDraftItem, item: ExtractedFood) -> None:
    # spoken_name/is_packaged_product sont des champs requis (non optionnels)
    # côté schéma d'extraction : le modèle les re-remplit toujours, y compris
    # pour une correction qui ne porte que sur la quantité — sans risque
    # d'écraser autre chose puisqu'il reflète sa compréhension à jour de
    # l'aliment. Les champs optionnels (quantité, macros) ne sont écrasés que
    # s'ils sont effectivement renseignés, cf. OPERATIONS_SYSTEM_PROMPT.
    row.spoken_name = item.spoken_name
    row.is_packaged_product = item.is_packaged_product
    if item.quantity_grams is not None:
        row.quantity_grams = item.quantity_grams
        row.quantity_units = None
    if item.quantity_units is not None:
        row.quantity_units = item.quantity_units
        row.quantity_grams = None
    if item.quantity_description is not None:
        row.quantity_description = item.quantity_description
    if item.dictated_macros is not None:
        row.dictated_macros = item.dictated_macros.normalized_to_100g().model_dump(mode="json")


def _serialize_draft_item(row: CaptureDraftItem) -> dict[str, Any]:
    return {
        "item_id": str(row.id),
        "spoken_name": row.spoken_name,
        "quantity_grams": row.quantity_grams,
        "quantity_units": row.quantity_units,
        "quantity_description": row.quantity_description,
        "is_packaged_product": row.is_packaged_product,
    }


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
    # TranscriptionStreamLanguage / UnknownRealtimeEvent : ignorés, pas
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
