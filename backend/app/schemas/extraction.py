from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.models.enums import MuscleGroup


class DictatedMacros(BaseModel):
    """Macros dictées par l'utilisateur pour un produit emballé inédit.

    Pour la quantité mentionnée telle quelle (`for_quantity_grams`), PAS
    ramenées à 100g par le modèle — cette normalisation arithmétique est
    faite ensuite en code (plus fiable qu'un calcul fait par le LLM).
    """

    for_quantity_grams: float = Field(
        description="Quantité en grammes à laquelle ces valeurs nutritionnelles correspondent (ex: 100 si c'est 'pour 100g', ou le poids total dicté)"
    )
    energy_kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    saturated_fat_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    salt_g: Optional[float] = None

    def normalized_to_100g(self) -> "DictatedMacros":
        factor = 100 / self.for_quantity_grams
        return DictatedMacros(
            for_quantity_grams=100,
            energy_kcal=self.energy_kcal * factor,
            protein_g=self.protein_g * factor,
            carbs_g=self.carbs_g * factor,
            fat_g=self.fat_g * factor,
            saturated_fat_g=self.saturated_fat_g * factor if self.saturated_fat_g is not None else None,
            sugars_g=self.sugars_g * factor if self.sugars_g is not None else None,
            fiber_g=self.fiber_g * factor if self.fiber_g is not None else None,
            salt_g=self.salt_g * factor if self.salt_g is not None else None,
        )


class ExtractedFood(BaseModel):
    kind: Literal["food"] = "food"
    spoken_name: str = Field(
        description="Nom de l'aliment tel que dicté, normalisé (singulier, sans déterminant, ex: 'pomme' pas 'des pommes')"
    )
    quantity_grams: Optional[float] = Field(
        default=None, description="Poids en grammes si explicitement dicté (ex: '150 grammes')"
    )
    quantity_units: Optional[float] = Field(
        default=None,
        description=(
            "Nombre d'unités/portions si la quantité est dictée comme un compte plutôt qu'un poids "
            "(ex: 'deux pommes' -> 2, 'un yaourt' -> 1, '3 tranches de pain' -> 3). "
            "Ne jamais remplir en même temps que quantity_grams."
        ),
    )
    quantity_description: Optional[str] = Field(
        default=None,
        description="Description de la quantité telle que dictée, dans tous les cas (ex: 'une pomme', 'deux tranches', 'un bol')",
    )
    is_packaged_product: bool = Field(
        default=False,
        description="True si l'aliment ressemble à un produit emballé/de marque plutôt qu'un aliment brut (fruit, légume, viande crue...)",
    )
    dictated_macros: Optional[DictatedMacros] = Field(
        default=None,
        description="Renseigné uniquement si l'utilisateur dicte explicitement les macros d'un nouveau produit emballé dans cette même prise",
    )


MET_ESTIMATE_DESCRIPTION = (
    "Estimation du MET (equivalent metabolique, 1 MET = 1 kcal/kg/heure) typique pour cette activité, "
    "d'après tes connaissances générales de l'intensité habituelle de ce type d'effort (ex: course à pied "
    "modérée ~9.8, marche ~3.5, vélo modéré ~7.5, natation ~8, musculation modérée ~5). Laisse vide si "
    "tu ne peux pas raisonnablement l'estimer."
)


class ExtractedStrengthSet(BaseModel):
    kind: Literal["strength_set"] = "strength_set"
    spoken_exercise_name: str = Field(description="Nom de l'exercice de musculation tel que dicté")
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    rir: Optional[float] = Field(
        default=None, description="RIR : nombre de répétitions en réserve si mentionné (ex: 'il m'en restait 2')"
    )
    met_estimate: Optional[float] = Field(default=None, description=MET_ESTIMATE_DESCRIPTION)
    target_muscles_estimate: list[MuscleGroup] = Field(
        default_factory=list,
        description=(
            "Groupes musculaires ciblés par cet exercice. Si l'utilisateur les mentionne explicitement "
            "dans sa dictée, reprends exactement ce qu'il dit. Sinon, déduis-les toi-même d'après tes "
            "connaissances générales (ex: développé couché -> pectoraux, triceps, epaules ; squat -> "
            "quadriceps, fessiers, ischios). Dans les deux cas, jamais redemandé à l'utilisateur."
        ),
    )


class ExtractedActivity(BaseModel):
    kind: Literal["activity"] = "activity"
    spoken_activity_name: str = Field(description="Nom de l'activité cardio/autre telle que dictée (ex: course, vélo)")
    duration_minutes: Optional[float] = None
    distance_km: Optional[float] = None
    met_estimate: Optional[float] = Field(default=None, description=MET_ESTIMATE_DESCRIPTION)


# Le discriminateur doit être porté par le type union lui-même (via Annotated),
# pas par le champ list[...] — sinon Pydantic v2 refuse de générer le schéma
# ("core schema type 'list' is not a valid discriminated union variant").
ExtractedItem = Annotated[
    Union[ExtractedFood, ExtractedStrengthSet, ExtractedActivity], Field(discriminator="kind")
]


class VoiceCaptureExtraction(BaseModel):
    """Résultat de l'extraction structurée d'une prise vocale : une liste hétérogène d'items.

    Une prise peut mélanger plusieurs aliments (repas composé), ou plusieurs
    séries d'exercices, ou les deux — cf. décision produit "multi-éléments
    par dictée" du plan.
    """

    items: list[ExtractedItem]
