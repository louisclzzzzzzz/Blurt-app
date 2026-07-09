export interface DictatedMacros {
  for_quantity_grams: number
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  saturated_fat_g: number | null
  sugars_g: number | null
  fiber_g: number | null
  salt_g: number | null
}

export interface MatchCandidate {
  food_item_id: string
  name: string
  brand: string | null
  score: number
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  default_portion_label: string | null
  default_portion_grams: number | null
}

export interface OffCandidate {
  off_barcode: string | null
  name: string
  brand: string | null
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  saturated_fat_g: number | null
  sugars_g: number | null
  fiber_g: number | null
  salt_g: number | null
}

export type MatchConfidence = 'high' | 'ambiguous' | 'none'

export interface PendingFoodItem {
  spoken_name: string
  quantity_grams: number | null
  quantity_units: number | null
  quantity_description: string | null
  is_packaged_product: boolean
  dictated_macros: DictatedMacros | null
  match_confidence: MatchConfidence
  candidates: MatchCandidate[]
  off_candidates: OffCandidate[]
  needs_quantity_confirmation: boolean
}

export interface ExerciseCandidate {
  exercise_id: string
  name: string
  score: number
}

export interface PendingStrengthSetItem {
  spoken_exercise_name: string
  reps: number | null
  weight_kg: number | null
  rir: number | null
  met_estimate: number | null
  match_confidence: MatchConfidence
  candidates: ExerciseCandidate[]
}

export interface ActivityCandidate {
  activity_type_id: string
  name: string
  score: number
}

export interface PendingActivityItem {
  spoken_activity_name: string
  duration_minutes: number | null
  distance_km: number | null
  met_estimate: number | null
  match_confidence: MatchConfidence
  candidates: ActivityCandidate[]
}

export interface CaptureCreateResponse {
  capture_id: string
  transcript: string
  food_items: PendingFoodItem[]
  strength_items: PendingStrengthSetItem[]
  activity_items: PendingActivityItem[]
}

export interface NewFoodInput {
  name: string
  brand?: string | null
  off_barcode?: string | null
  is_packaged?: boolean
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  saturated_fat_g?: number | null
  sugars_g?: number | null
  fiber_g?: number | null
  salt_g?: number | null
}

export interface ValidatedFoodItem {
  spoken_name: string
  quantity_grams: number
  food_item_id?: string | null
  create_new_food?: NewFoodInput | null
}

export interface ValidatedStrengthSetItem {
  spoken_exercise_name: string
  reps?: number | null
  weight_kg?: number | null
  rir?: number | null
  met_estimate?: number | null
  exercise_id?: string | null
}

export interface ValidatedActivityItem {
  spoken_activity_name: string
  duration_minutes?: number | null
  distance_km?: number | null
  met_estimate?: number | null
  activity_type_id?: string | null
}

export interface ValidateCaptureRequest {
  logged_at?: string | null
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  food_items: ValidatedFoodItem[]
  strength_items: ValidatedStrengthSetItem[]
  activity_items: ValidatedActivityItem[]
}

export interface FoodConsumptionRead {
  id: string
  food_item_id: string
  quantity_grams: number
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface StrengthSetRead {
  id: string
  exercise_id: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  rir: number | null
}

export interface ActivityLogRead {
  id: string
  activity_type_id: string
  duration_minutes: number | null
  distance_km: number | null
  calories_kcal: number | null
}

export interface ValidateCaptureResponse {
  meal_entry_id: string | null
  consumptions: FoodConsumptionRead[]
  workout_session_id: string | null
  workout_session_calories_kcal: number | null
  strength_sets: StrengthSetRead[]
  activity_logs: ActivityLogRead[]
}

export interface UserProfile {
  sex: 'male' | 'female'
  birth_date: string
  height_cm: number
  weight_kg: number
  calorie_goal_kcal: number | null
  protein_goal_g: number | null
  carbs_goal_g: number | null
  fat_goal_g: number | null
}

export type ItemResolution =
  | { type: 'existing'; foodItemId: string }
  | { type: 'create_new'; food: NewFoodInput }
  | { type: 'unresolved' }

/** État d'édition local d'un item aliment, côté validation (avant envoi au backend). */
export interface EditableItem {
  spoken_name: string
  quantity_description: string | null
  is_packaged_product: boolean
  dictated_macros: DictatedMacros | null
  candidates: MatchCandidate[]
  off_candidates: OffCandidate[]
  removed: boolean
  quantityGrams: number | null
  // Nombre d'unités/portions (ex: "2" pommes) quand l'aliment sélectionné a une
  // default_portion_grams connue — quantityGrams reste la valeur envoyée au
  // backend, calculée à partir de quantityUnits x portion.
  quantityUnits: number | null
  resolution: ItemResolution
}

export type ExerciseResolution =
  | { type: 'existing'; exerciseId: string }
  | { type: 'create_new' }
  | { type: 'unresolved' }

/** Une série au sein d'un groupe d'exercice, côté validation. Tout est optionnel :
 * on doit pouvoir valider un exercice avec juste le nombre de séries. */
export interface EditableSet {
  reps: number | null
  weightKg: number | null
  rir: number | null
}

/** Un exercice et toutes ses séries dictées dans la même prise, regroupées
 * sous une seule carte (une correspondance à choisir, pas une par série). */
export interface EditableExerciseGroup {
  spoken_exercise_name: string
  candidates: ExerciseCandidate[]
  resolution: ExerciseResolution
  sets: EditableSet[]
  removed: boolean
  metEstimate: number | null
}

export type ActivityResolution =
  | { type: 'existing'; activityTypeId: string }
  | { type: 'create_new' }
  | { type: 'unresolved' }

/** État d'édition local d'une activité, côté validation. Pas de regroupement
 * par nom (contrairement aux exercices) : dicter deux fois la même activité
 * dans une prise n'est pas un motif naturel, chaque item reste autonome. */
export interface EditableActivityItem {
  spoken_activity_name: string
  candidates: ActivityCandidate[]
  resolution: ActivityResolution
  durationMinutes: number | null
  distanceKm: number | null
  removed: boolean
  metEstimate: number | null
}
