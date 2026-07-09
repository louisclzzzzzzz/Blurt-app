import type { MuscleGroup } from './catalogue'

export interface MuscleVolumeDay {
  date: string
  sets: number
}

export interface MuscleVolumeGroup {
  muscle_group: MuscleGroup
  daily_counts: MuscleVolumeDay[]
  total_sets: number
}

export interface CalorieVolumeDay {
  date: string
  calories_kcal: number
}

export interface WeeklyMuscleVolumeResponse {
  week_start: string
  muscle_groups: MuscleVolumeGroup[]
  daily_calories: CalorieVolumeDay[]
  total_calories_kcal: number
}
