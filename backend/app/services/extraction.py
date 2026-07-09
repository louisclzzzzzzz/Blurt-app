from app.config import get_settings
from app.schemas.extraction import VoiceCaptureExtraction
from app.services.mistral_client import get_mistral_client

SYSTEM_PROMPT = """Tu extrais les informations structurées d'une dictée vocale d'un utilisateur qui fait le suivi de son alimentation, ses activités physiques et sa musculation.

La dictée peut mentionner plusieurs éléments à la fois (ex: un repas avec plusieurs aliments, ou plusieurs séries d'exercices). Retourne un item par élément mentionné, dans l'ordre où ils sont dictés.

Pour chaque aliment :
- normalise le nom au singulier, sans déterminant (ex: "pomme" pas "une pomme" ni "des pommes")
- si un poids est explicitement dicté (grammes, kilos...), convertis-le en grammes dans quantity_grams
- si la quantité est dictée comme un nombre d'unités/portions plutôt qu'un poids (ex: "deux pommes", "un yaourt", "3 tranches de pain"), remplis quantity_units avec ce nombre (2, 1, 3...) — jamais en même temps que quantity_grams
- remplis toujours quantity_description avec la quantité telle que dictée, même quand quantity_grams ou quantity_units est rempli (ex: "une pomme", "deux tranches", "un bol")
- marque is_packaged_product à true si c'est un produit de marque/transformé plutôt qu'un aliment brut (fruit, légume, viande crue, œuf...)
- si l'utilisateur dicte explicitement des valeurs nutritionnelles pour un produit, remplis dictated_macros avec ces valeurs telles quelles et la quantité à laquelle elles correspondent (for_quantity_grams) — ne fais aucun calcul de conversion toi-même

Pour chaque série de musculation : un item par série si plusieurs sont dictées séparément (ex: "3 séries de 10 à 60 kilos" peut être décomposé en plusieurs items ou en un seul avec le contexte donné dans reps/weight_kg — privilégie la fidélité à ce qui est dit).

Pour chaque série de musculation et chaque activité cardio/autre : remplis met_estimate d'après tes connaissances générales de l'intensité typique de cet effort (cf. description du champ) — utile uniquement la première fois qu'un exercice/activité est rencontré, une estimation raisonnable suffit.

Pour chaque série de musculation : remplis aussi target_muscles_estimate avec les groupes musculaires principalement ciblés par l'exercice, d'après tes connaissances générales (cf. description du champ) — même logique que met_estimate, une estimation raisonnable suffit, ne redemande jamais à l'utilisateur.

Ton rôle est uniquement l'extraction : ne devine jamais une correspondance avec un aliment ou exercice existant, ne complète jamais une donnée non dictée (hormis met_estimate et target_muscles_estimate, qui sont des estimations générales et non des correspondances)."""


async def extract_from_transcript(transcript: str) -> VoiceCaptureExtraction:
    settings = get_settings()
    response = await get_mistral_client().chat.parse_async(
        model=settings.mistral_extraction_model,
        response_format=VoiceCaptureExtraction,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript},
        ],
    )
    parsed = response.choices[0].message.parsed
    assert parsed is not None
    return parsed
