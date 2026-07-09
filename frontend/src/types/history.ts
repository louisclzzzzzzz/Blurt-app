import type { ActivityTypeRead, ExerciseRead, FoodRead } from './catalogue'

export interface HistoryFoodConsumptionRead {
  id: string
  quantity_grams: number
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  food_item: FoodRead
}

export interface HistoryMealEntryRead {
  id: string
  logged_at: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  consumptions: HistoryFoodConsumptionRead[]
}

export interface HistoryStrengthSetRead {
  id: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  rir: number | null
  exercise: ExerciseRead
}

export interface HistoryWorkoutSessionRead {
  id: string
  started_at: string
  ended_at: string | null
  calories_kcal: number | null
  sets: HistoryStrengthSetRead[]
}

export interface HistoryActivityLogRead {
  id: string
  logged_at: string
  duration_minutes: number | null
  distance_km: number | null
  calories_kcal: number | null
  activity_type: ActivityTypeRead
}

export interface DayHistoryResponse {
  date: string
  meals: HistoryMealEntryRead[]
  workout_sessions: HistoryWorkoutSessionRead[]
  activity_logs: HistoryActivityLogRead[]
}

export interface DeleteConsumptionResponse {
  meal_entry_deleted: boolean
}

export interface UpdateSetRequest {
  reps: number | null
  weight_kg: number | null
  rir: number | null
}

export interface DeleteSetResponse {
  session_deleted: boolean
  session_calories_kcal: number | null
}

export interface UpdateActivityLogRequest {
  duration_minutes: number | null
  distance_km: number | null
}
