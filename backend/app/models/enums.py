from enum import StrEnum


class FoodSource(StrEnum):
    CIQUAL = "ciqual"
    OFF = "off"
    USER = "user"


class MealType(StrEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class CaptureStatus(StrEnum):
    UPLOADED = "uploaded"
    TRANSCRIBING = "transcribing"
    EXTRACTING = "extracting"
    PENDING_VALIDATION = "pending_validation"
    VALIDATED = "validated"
    DISCARDED = "discarded"


class MatchMethod(StrEnum):
    EXACT_ALIAS = "exact_alias"
    FUZZY = "fuzzy"
    EMBEDDING = "embedding"
    OFF_LOOKUP = "off_lookup"
    MANUAL = "manual"
    CREATED_NEW = "created_new"


class Sex(StrEnum):
    MALE = "male"
    FEMALE = "female"


class MuscleGroup(StrEnum):
    PECTORAUX = "pectoraux"
    DOS = "dos"
    TRAPEZES = "trapezes"
    EPAULES = "epaules"
    BICEPS = "biceps"
    TRICEPS = "triceps"
    AVANT_BRAS = "avant_bras"
    ABDOS = "abdos"
    QUADRICEPS = "quadriceps"
    ISCHIOS = "ischios"
    MOLLETS = "mollets"
    FESSIERS = "fessiers"
