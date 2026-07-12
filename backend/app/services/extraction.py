import json

from app.config import get_settings
from app.schemas.extraction import DraftItemContext, DraftOperations, VoiceCaptureExtraction
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

Pour chaque série de musculation : remplis aussi target_muscles_estimate avec les groupes musculaires ciblés par l'exercice — si l'utilisateur les mentionne explicitement dans sa dictée (ex: "développé couché, ça cible les pecs et les triceps"), reprends exactement ce qu'il dit ; sinon, déduis-les toi-même d'après tes connaissances générales de l'exercice (cf. description du champ). Dans les deux cas, ne redemande jamais à l'utilisateur.

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


# Prompt dédié à la dictée live nutrition (pilote, cf. DICTEE_LIVE_NUTRITION.md) :
# tâche de diff par rapport à un brouillon existant, pas une extraction en un
# seul bloc — ne réutilise pas SYSTEM_PROMPT, qui suppose l'inverse.
OPERATIONS_SYSTEM_PROMPT = """Tu mets à jour un brouillon de repas en cours de dictée, à partir d'un nouveau segment de transcription vocale. Domaine nutrition uniquement.

Le brouillon (fourni en JSON) contient les aliments déjà identifiés dans les segments précédents de la MÊME dictée, chacun avec un item_id. Pour le nouveau segment, produis une liste d'opérations :

- "add" : un nouvel aliment mentionné pour la première fois. Un item par aliment, pas de target_item_id.
- "modify" : une correction en langage libre d'un aliment déjà dans le brouillon (ex: "en fait c'était 150 grammes", "pas de la banane, de la pomme"). target_item_id = item_id de l'aliment concerné dans le brouillon fourni. Dans "item", ne renseigne que les champs qui changent réellement (les autres restent vides/null) — ne redonne pas l'intégralité de l'aliment.
- "remove" : l'utilisateur retire un aliment déjà dans le brouillon (ex: "en fait laisse tomber le yaourt"). target_item_id renseigné, pas d'item.

Une correction porte presque toujours sur le DERNIER aliment ajouté, sauf si l'utilisateur précise explicitement un autre aliment du brouillon. N'interprète un segment comme "modify"/"remove" que s'il contient un signal de correction explicite (ex: "en fait", "non plutôt", "pas X mais Y", "laisse tomber", "annule"...) — sinon c'est toujours un "add", même si l'aliment ressemble à un item déjà présent.

Mêmes règles d'extraction que d'habitude pour les champs d'un aliment (poids/quantité en grammes ou en unités, produit emballé, macros dictées).

Si le segment ne contient aucune information nutritionnelle exploitable (bruit, hésitation, hors sujet), retourne une liste d'opérations vide."""


async def extract_operations(
    segment_text: str, current_items: list[DraftItemContext]
) -> DraftOperations:
    """Diff incrémental pour la dictée live nutrition : détermine si un
    segment de transcription ajoute, corrige ou retire un item du brouillon
    courant — cf. DICTEE_LIVE_NUTRITION.md (Phase 7B)."""
    settings = get_settings()
    draft_state = json.dumps(
        [item.model_dump() for item in current_items], ensure_ascii=False
    )
    response = await get_mistral_client().chat.parse_async(
        model=settings.mistral_extraction_model,
        response_format=DraftOperations,
        messages=[
            {"role": "system", "content": OPERATIONS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Brouillon actuel :\n{draft_state}\n\nNouveau segment dicté :\n{segment_text}",
            },
        ],
    )
    parsed = response.choices[0].message.parsed
    assert parsed is not None
    return parsed
