export interface FoodRead {
  id: string
  name: string
  source: 'ciqual' | 'off' | 'user'
  is_packaged: boolean
  brand: string | null
  ciqual_code: string | null
  off_barcode: string | null
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  saturated_fat_g: number | null
  sugars_g: number | null
  fiber_g: number | null
  salt_g: number | null
  default_portion_label: string | null
  default_portion_grams: number | null
}

export type MuscleGroup =
  | 'pectoraux'
  | 'dos'
  | 'trapezes'
  | 'epaules'
  | 'biceps'
  | 'triceps'
  | 'avant_bras'
  | 'abdos'
  | 'quadriceps'
  | 'ischios'
  | 'mollets'
  | 'fessiers'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'pectoraux',
  'dos',
  'trapezes',
  'epaules',
  'biceps',
  'triceps',
  'avant_bras',
  'abdos',
  'quadriceps',
  'ischios',
  'mollets',
  'fessiers',
]

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  trapezes: 'Trapèzes',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avant_bras: 'Avant-bras',
  abdos: 'Abdos',
  quadriceps: 'Quadriceps',
  ischios: 'Ischio-jambiers',
  mollets: 'Mollets',
  fessiers: 'Fessiers',
}

export interface ExerciseRead {
  id: string
  name: string
  equipment: string | null
  target_muscles: MuscleGroup[]
  met_value: number | null
}

export interface ActivityTypeRead {
  id: string
  name: string
  met_value: number | null
}

export interface AliasRead {
  id: string
  alias_text: string
}

export interface FoodDetailRead extends FoodRead {
  aliases: AliasRead[]
}

export interface ExerciseDetailRead extends ExerciseRead {
  aliases: AliasRead[]
}

export interface ActivityTypeDetailRead extends ActivityTypeRead {
  aliases: AliasRead[]
}

export interface UpdateFoodRequest {
  name?: string
  brand?: string | null
  energy_kcal?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  saturated_fat_g?: number | null
  sugars_g?: number | null
  fiber_g?: number | null
  salt_g?: number | null
  default_portion_label?: string | null
  default_portion_grams?: number | null
}

export interface UpdateExerciseRequest {
  name?: string
  equipment?: string | null
  target_muscles?: MuscleGroup[]
  met_value?: number | null
}

export interface UpdateActivityTypeRequest {
  name?: string
  met_value?: number | null
}

export interface MergeResponse {
  target_id: string
  merged_alias_count: number
  reassigned_reference_count: number
}
