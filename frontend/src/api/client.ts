import type {
  ActivityLogRead,
  CaptureCreateResponse,
  FoodConsumptionRead,
  StrengthSetRead,
  UserProfile,
  ValidateCaptureRequest,
  ValidateCaptureResponse,
} from '../types/capture'
import type {
  ActivityTypeDetailRead,
  ActivityTypeRead,
  ExerciseDetailRead,
  ExerciseRead,
  FoodDetailRead,
  FoodRead,
  MergeResponse,
  UpdateActivityTypeRequest,
  UpdateExerciseRequest,
  UpdateFoodRequest,
} from '../types/catalogue'
import type {
  DayHistoryResponse,
  DeleteConsumptionResponse,
  DeleteSetResponse,
  UpdateActivityLogRequest,
  UpdateSetRequest,
} from '../types/history'
import type { WeeklyMuscleVolumeResponse } from '../types/volume'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

/** Dérive l'URL WebSocket (ws/wss) à partir de la même base que les appels fetch. */
export function getWebSocketUrl(path: string): string {
  return `${API_BASE_URL}${path}`.replace(/^http/, 'ws')
}

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }
  return response.json()
}

export async function createCapture(
  audioBlob: Blob,
  filename: string,
): Promise<CaptureCreateResponse> {
  const formData = new FormData()
  formData.append('audio', audioBlob, filename)
  const response = await fetch(`${API_BASE_URL}/captures`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    throw new Error(`Échec de l'envoi de la dictée (${response.status})`)
  }
  return response.json()
}

/** Simule une dictée sans micro (dev/debug) : saute l'audio/Voxtral, va direct à l'extraction. */
export async function createCaptureFromText(transcript: string): Promise<CaptureCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/captures/from-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  })
  if (!response.ok) {
    throw new Error(`Échec du traitement du texte (${response.status})`)
  }
  return response.json()
}

export async function validateCapture(
  captureId: string,
  payload: ValidateCaptureRequest,
): Promise<ValidateCaptureResponse> {
  const response = await fetch(`${API_BASE_URL}/captures/${captureId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Échec de la validation (${response.status})`)
  }
  return response.json()
}

export async function discardCapture(captureId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/captures/${captureId}/discard`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Échec de l'abandon (${response.status})`)
  }
}

/** Profil biométrique mono-utilisateur (âge/taille/poids/sexe), utilisé pour estimer les calories dépensées. */
export async function getProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_BASE_URL}/profile`)
  if (!response.ok) {
    throw new Error(`Échec de la récupération du profil (${response.status})`)
  }
  return response.json()
}

export async function updateProfile(profile: UserProfile): Promise<UserProfile> {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!response.ok) {
    throw new Error(`Échec de la mise à jour du profil (${response.status})`)
  }
  return response.json()
}

/** Vue consolidée d'une journée (repas/séances/activités), date au format YYYY-MM-DD. */
export async function getHistory(date: string): Promise<DayHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/history?date=${date}`)
  if (!response.ok) {
    throw new Error(`Échec de la récupération de l'historique (${response.status})`)
  }
  return response.json()
}

export async function updateConsumption(
  mealId: string,
  consumptionId: string,
  quantityGrams: number,
): Promise<FoodConsumptionRead> {
  const response = await fetch(`${API_BASE_URL}/meals/${mealId}/consumptions/${consumptionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity_grams: quantityGrams }),
  })
  if (!response.ok) {
    throw new Error(`Échec de la modification (${response.status})`)
  }
  return response.json()
}

export async function deleteConsumption(
  mealId: string,
  consumptionId: string,
): Promise<DeleteConsumptionResponse> {
  const response = await fetch(`${API_BASE_URL}/meals/${mealId}/consumptions/${consumptionId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Échec de la suppression (${response.status})`)
  }
  return response.json()
}

export async function deleteMeal(mealId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/meals/${mealId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Échec de la suppression (${response.status})`)
  }
}

export async function updateSet(
  sessionId: string,
  setId: string,
  payload: UpdateSetRequest,
): Promise<StrengthSetRead> {
  const response = await fetch(`${API_BASE_URL}/workouts/${sessionId}/sets/${setId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Échec de la modification (${response.status})`)
  }
  return response.json()
}

export async function deleteSet(sessionId: string, setId: string): Promise<DeleteSetResponse> {
  const response = await fetch(`${API_BASE_URL}/workouts/${sessionId}/sets/${setId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Échec de la suppression (${response.status})`)
  }
  return response.json()
}

export async function deleteWorkoutSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/workouts/${sessionId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Échec de la suppression (${response.status})`)
  }
}

export async function updateActivityLog(
  activityLogId: string,
  payload: UpdateActivityLogRequest,
): Promise<ActivityLogRead> {
  const response = await fetch(`${API_BASE_URL}/activity-logs/${activityLogId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Échec de la modification (${response.status})`)
  }
  return response.json()
}

export async function deleteActivityLog(activityLogId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/activity-logs/${activityLogId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Échec de la suppression (${response.status})`)
  }
}

/** Volume hebdomadaire (nombre de séries) par groupe musculaire. weekStart : lundi, format YYYY-MM-DD. */
export async function getWeeklyMuscleVolume(weekStart?: string): Promise<WeeklyMuscleVolumeResponse> {
  const params = new URLSearchParams()
  if (weekStart) params.set('week_start', weekStart)
  const response = await fetch(`${API_BASE_URL}/workouts/muscle-volume?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Échec de la récupération du volume musculaire (${response.status})`)
  }
  return response.json()
}

// --- Catalogue (aliments/exercices/activités) : recherche, correction, fusion ---
// Cœur générique partagé + wrappers nommés par domaine, comme services/catalogue.py côté backend.

async function searchCatalogue<T>(
  path: string,
  query: string,
  extraParams?: Record<string, string>,
): Promise<T[]> {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  for (const [key, value] of Object.entries(extraParams ?? {})) params.set(key, value)
  const response = await fetch(`${API_BASE_URL}${path}?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Échec de la recherche (${response.status})`)
  }
  return response.json()
}

async function getCatalogueEntry<T>(path: string, id: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}/${id}`)
  if (!response.ok) {
    throw new Error(`Échec de la récupération (${response.status})`)
  }
  return response.json()
}

async function updateCatalogueEntry<T>(path: string, id: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`Échec de la modification (${response.status})`)
  }
  return response.json()
}

async function deleteCatalogueAlias(path: string, id: string, aliasId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}/${id}/aliases/${aliasId}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Échec de la suppression (${response.status})`)
  }
}

async function mergeCatalogueEntry(path: string, id: string, targetId: string): Promise<MergeResponse> {
  const response = await fetch(`${API_BASE_URL}${path}/${id}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_id: targetId }),
  })
  if (!response.ok) {
    throw new Error(`Échec de la fusion (${response.status})`)
  }
  return response.json()
}

export const searchFoods = (query: string, sourceGroup?: 'ciqual' | 'custom') =>
  searchCatalogue<FoodRead>('/foods', query, sourceGroup ? { source_group: sourceGroup } : undefined)
export const getFoodDetail = (id: string) => getCatalogueEntry<FoodDetailRead>('/foods', id)
export const updateFood = (id: string, payload: UpdateFoodRequest) =>
  updateCatalogueEntry<FoodDetailRead>('/foods', id, payload)
export const deleteFoodAlias = (id: string, aliasId: string) => deleteCatalogueAlias('/foods', id, aliasId)
export const mergeFoods = (id: string, targetId: string) => mergeCatalogueEntry('/foods', id, targetId)

export const searchExercises = (query: string) => searchCatalogue<ExerciseRead>('/exercises', query)
export const getExerciseDetail = (id: string) => getCatalogueEntry<ExerciseDetailRead>('/exercises', id)
export const updateExercise = (id: string, payload: UpdateExerciseRequest) =>
  updateCatalogueEntry<ExerciseDetailRead>('/exercises', id, payload)
export const deleteExerciseAlias = (id: string, aliasId: string) =>
  deleteCatalogueAlias('/exercises', id, aliasId)
export const mergeExercises = (id: string, targetId: string) => mergeCatalogueEntry('/exercises', id, targetId)

export const searchActivities = (query: string) => searchCatalogue<ActivityTypeRead>('/activities', query)
export const getActivityDetail = (id: string) => getCatalogueEntry<ActivityTypeDetailRead>('/activities', id)
export const updateActivity = (id: string, payload: UpdateActivityTypeRequest) =>
  updateCatalogueEntry<ActivityTypeDetailRead>('/activities', id, payload)
export const deleteActivityAlias = (id: string, aliasId: string) =>
  deleteCatalogueAlias('/activities', id, aliasId)
export const mergeActivities = (id: string, targetId: string) =>
  mergeCatalogueEntry('/activities', id, targetId)
