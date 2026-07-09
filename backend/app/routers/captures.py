import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.enums import CaptureStatus
from app.models.voice_capture import VoiceCapture
from app.schemas.api import (
    ActivityCandidate,
    CaptureCreateResponse,
    ExerciseCandidate,
    MatchCandidate,
    OffCandidate,
    PendingActivityItem,
    PendingFoodItem,
    PendingStrengthSetItem,
    TextCaptureRequest,
)
from app.schemas.extraction import ExtractedActivity, ExtractedFood, ExtractedStrengthSet
from app import storage
from app.services import off_client
from app.services.extraction import extract_from_transcript
from app.services.matching import MatchConfidence, match_activity, match_exercise, match_food
from app.services.transcription import transcribe_audio

router = APIRouter(prefix="/captures", tags=["captures"])


@router.post("", response_model=CaptureCreateResponse)
async def create_capture(
    audio: UploadFile, session: AsyncSession = Depends(get_session)
) -> CaptureCreateResponse:
    """Pipeline complet d'une prise vocale : upload -> transcription -> extraction -> matching.

    Ne persiste rien de définitif (pas de repas créé) : retourne les items
    détectés avec leur statut de correspondance, à confirmer via
    POST /captures/{id}/validate.
    """
    audio_bytes = await audio.read()
    content_type = audio.content_type or "audio/webm"

    audio_path = await storage.upload_audio(audio_bytes, content_type=content_type)
    capture = VoiceCapture(audio_url=audio_path, status=CaptureStatus.TRANSCRIBING)
    session.add(capture)
    await session.commit()
    await session.refresh(capture)

    transcript = await transcribe_audio(audio_bytes, filename=audio.filename or "capture.webm")
    return await _process_transcript(session, capture, transcript)


@router.post("/from-text", response_model=CaptureCreateResponse)
async def create_capture_from_text(
    payload: TextCaptureRequest, session: AsyncSession = Depends(get_session)
) -> CaptureCreateResponse:
    """Comme POST /captures, mais saute l'audio et la transcription Voxtral :
    utile pour tester extraction/matching/validation sans micro (dev/debug).
    """
    capture = VoiceCapture(audio_url="text-input", status=CaptureStatus.EXTRACTING)
    session.add(capture)
    await session.commit()
    await session.refresh(capture)
    return await _process_transcript(session, capture, payload.transcript)


async def _process_transcript(
    session: AsyncSession, capture: VoiceCapture, transcript: str
) -> CaptureCreateResponse:
    capture.transcript_text = transcript
    capture.status = CaptureStatus.EXTRACTING
    session.add(capture)
    await session.commit()

    extraction = await extract_from_transcript(transcript)
    capture.raw_extraction = extraction.model_dump(mode="json")
    capture.status = CaptureStatus.PENDING_VALIDATION
    session.add(capture)
    await session.commit()

    food_items = [
        await _resolve_food_item(session, item)
        for item in extraction.items
        if isinstance(item, ExtractedFood)
    ]
    strength_items = [
        await _resolve_strength_set_item(session, item)
        for item in extraction.items
        if isinstance(item, ExtractedStrengthSet)
    ]
    activity_items = [
        await _resolve_activity_item(session, item)
        for item in extraction.items
        if isinstance(item, ExtractedActivity)
    ]

    return CaptureCreateResponse(
        capture_id=capture.id,
        transcript=transcript,
        food_items=food_items,
        strength_items=strength_items,
        activity_items=activity_items,
    )


async def _resolve_food_item(session: AsyncSession, item: ExtractedFood) -> PendingFoodItem:
    has_dictated_macros = item.dictated_macros is not None

    # Des macros dictées signifient que l'utilisateur crée un nouvel aliment
    # de toutes pièces : on ne cherche même pas de correspondance catalogue
    # (ni DB, ni Open Food Facts) — la confirmation se fait uniquement sur les
    # valeurs dictées, jamais sur un choix parmi des candidats.
    if has_dictated_macros:
        match_confidence = MatchConfidence.NONE.value
        candidates: list[MatchCandidate] = []
        off_candidates: list[OffCandidate] = []
        needs_quantity_confirmation = item.quantity_grams is None
    else:
        match_result = await match_food(session, item.spoken_name)
        candidates = [
            MatchCandidate(
                food_item_id=c.item.id,
                name=c.item.name,
                brand=c.item.brand,
                score=c.score,
                energy_kcal=c.item.energy_kcal,
                protein_g=c.item.protein_g,
                carbs_g=c.item.carbs_g,
                fat_g=c.item.fat_g,
                default_portion_label=c.item.default_portion_label,
                default_portion_grams=c.item.default_portion_grams,
            )
            for c in match_result.candidates
        ]

        off_candidates = []
        if match_result.confidence == MatchConfidence.NONE and item.is_packaged_product:
            off_results = await off_client.search_packaged_food(item.spoken_name)
            off_candidates = [OffCandidate(**r) for r in off_results]

        needs_quantity_confirmation = False
        if item.quantity_grams is None:
            best = match_result.best
            if best is None or best.default_portion_grams is None:
                needs_quantity_confirmation = True

        match_confidence = match_result.confidence.value

    dictated_macros = item.dictated_macros.normalized_to_100g() if item.dictated_macros else None

    return PendingFoodItem(
        spoken_name=item.spoken_name,
        quantity_grams=item.quantity_grams,
        quantity_units=item.quantity_units,
        quantity_description=item.quantity_description,
        is_packaged_product=item.is_packaged_product,
        dictated_macros=dictated_macros,
        match_confidence=match_confidence,
        candidates=candidates,
        off_candidates=off_candidates,
        needs_quantity_confirmation=needs_quantity_confirmation,
    )


async def _resolve_strength_set_item(
    session: AsyncSession, item: ExtractedStrengthSet
) -> PendingStrengthSetItem:
    match_result = await match_exercise(session, item.spoken_exercise_name)
    candidates = [
        ExerciseCandidate(exercise_id=c.item.id, name=c.item.name, score=c.score)
        for c in match_result.candidates
    ]
    # Confiance "none" (aucun candidat) : la fiche sera créée automatiquement
    # à la validation, pas de confirmation nécessaire (pas de macros à
    # fournir contrairement aux aliments) — cf. plan.
    return PendingStrengthSetItem(
        spoken_exercise_name=item.spoken_exercise_name,
        reps=item.reps,
        weight_kg=item.weight_kg,
        rir=item.rir,
        met_estimate=item.met_estimate,
        target_muscles_estimate=item.target_muscles_estimate,
        match_confidence=match_result.confidence.value,
        candidates=candidates,
    )


async def _resolve_activity_item(session: AsyncSession, item: ExtractedActivity) -> PendingActivityItem:
    match_result = await match_activity(session, item.spoken_activity_name)
    candidates = [
        ActivityCandidate(activity_type_id=c.item.id, name=c.item.name, score=c.score)
        for c in match_result.candidates
    ]
    # Confiance "none" (aucun candidat) : la fiche sera créée automatiquement
    # à la validation, même logique que pour les exercices.
    return PendingActivityItem(
        spoken_activity_name=item.spoken_activity_name,
        duration_minutes=item.duration_minutes,
        distance_km=item.distance_km,
        met_estimate=item.met_estimate,
        match_confidence=match_result.confidence.value,
        candidates=candidates,
    )


@router.get("/{capture_id}")
async def get_capture(capture_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> dict:
    capture = await session.get(VoiceCapture, capture_id)
    if capture is None:
        raise HTTPException(status_code=404, detail="Capture introuvable")
    return {
        "id": capture.id,
        "status": capture.status,
        "transcript_text": capture.transcript_text,
        "created_at": capture.created_at,
    }


@router.post("/{capture_id}/discard")
async def discard_capture(capture_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> dict:
    capture = await session.get(VoiceCapture, capture_id)
    if capture is None:
        raise HTTPException(status_code=404, detail="Capture introuvable")
    capture.status = CaptureStatus.DISCARDED
    session.add(capture)
    await session.commit()
    return {"status": "discarded"}
