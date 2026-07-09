from app.config import get_settings
from app.services.mistral_client import get_mistral_client


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Calcule les embeddings mistral-embed pour une liste de textes, dans le même ordre que l'entrée."""
    settings = get_settings()
    response = await get_mistral_client().embeddings.create_async(
        model=settings.mistral_embed_model, inputs=texts
    )
    return [item.embedding for item in sorted(response.data, key=lambda d: d.index)]
