import { useState } from 'react'
import { discardCapture, validateCapture } from '../api/client'
import {
  buildEditableActivityItems,
  buildEditableExerciseGroups,
  buildEditableItems,
} from '../lib/buildEditableItems'
import type {
  CaptureCreateResponse,
  EditableActivityItem,
  EditableExerciseGroup,
  EditableItem,
  ValidatedActivityItem,
  ValidatedFoodItem,
  ValidatedStrengthSetItem,
  ValidateCaptureResponse,
} from '../types/capture'
import { ActivityItemRow } from './ActivityItemRow'
import { ExerciseGroupCard } from './ExerciseGroupCard'
import { FoodItemRow } from './FoodItemRow'

interface ValidationScreenProps {
  capture: CaptureCreateResponse
  onDone: (response: ValidateCaptureResponse) => void
  onCancel: () => void
}

export function ValidationScreen({ capture, onDone, onCancel }: ValidationScreenProps) {
  const [foodItems, setFoodItems] = useState<EditableItem[]>(() => buildEditableItems(capture))
  const [exerciseGroups, setExerciseGroups] = useState<EditableExerciseGroup[]>(() =>
    buildEditableExerciseGroups(capture),
  )
  const [activityItems, setActivityItems] = useState<EditableActivityItem[]>(() =>
    buildEditableActivityItems(capture),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateFoodItem = (index: number, updated: EditableItem) => {
    setFoodItems((prev) => prev.map((item, i) => (i === index ? updated : item)))
  }
  const removeFoodItem = (index: number) => {
    setFoodItems((prev) => prev.map((item, i) => (i === index ? { ...item, removed: true } : item)))
  }

  const updateExerciseGroup = (index: number, updated: EditableExerciseGroup) => {
    setExerciseGroups((prev) => prev.map((group, i) => (i === index ? updated : group)))
  }
  const removeExerciseGroup = (index: number) => {
    setExerciseGroups((prev) => prev.map((group, i) => (i === index ? { ...group, removed: true } : group)))
  }

  const updateActivityItem = (index: number, updated: EditableActivityItem) => {
    setActivityItems((prev) => prev.map((item, i) => (i === index ? updated : item)))
  }
  const removeActivityItem = (index: number) => {
    setActivityItems((prev) => prev.map((item, i) => (i === index ? { ...item, removed: true } : item)))
  }

  const activeFoodItems = foodItems.filter((item) => !item.removed)
  // Un groupe vidé de toutes ses séries équivaut à un exercice retiré.
  const activeExerciseGroups = exerciseGroups.filter((group) => !group.removed && group.sets.length > 0)
  const activeActivityItems = activityItems.filter((item) => !item.removed)

  const foodItemsReady = activeFoodItems.every(
    (item) => item.quantityGrams !== null && item.quantityGrams > 0 && item.resolution.type !== 'unresolved',
  )
  const exerciseGroupsReady = activeExerciseGroups.every((group) => group.resolution.type !== 'unresolved')
  const activityItemsReady = activeActivityItems.every((item) => item.resolution.type !== 'unresolved')
  const canSubmit =
    (activeFoodItems.length > 0 || activeExerciseGroups.length > 0 || activeActivityItems.length > 0) &&
    foodItemsReady &&
    exerciseGroupsReady &&
    activityItemsReady

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const foodPayload: ValidatedFoodItem[] = activeFoodItems.map((item) => ({
        spoken_name: item.spoken_name,
        quantity_grams: item.quantityGrams as number,
        food_item_id: item.resolution.type === 'existing' ? item.resolution.foodItemId : undefined,
        create_new_food: item.resolution.type === 'create_new' ? item.resolution.food : undefined,
      }))
      // Chaque série du groupe partage la même résolution (existante ou
      // nouvelle) : le backend dédoublonne la création par nom au sein
      // d'une même requête, une seule fiche exercice sera créée pour le groupe.
      const strengthPayload: ValidatedStrengthSetItem[] = activeExerciseGroups.flatMap((group) =>
        group.sets.map((set) => ({
          spoken_exercise_name: group.spoken_exercise_name,
          reps: set.reps,
          weight_kg: set.weightKg,
          rir: set.rir,
          met_estimate: group.metEstimate,
          target_muscles_estimate: group.targetMusclesEstimate,
          exercise_id: group.resolution.type === 'existing' ? group.resolution.exerciseId : undefined,
        })),
      )
      const activityPayload: ValidatedActivityItem[] = activeActivityItems.map((item) => ({
        spoken_activity_name: item.spoken_activity_name,
        duration_minutes: item.durationMinutes,
        distance_km: item.distanceKm,
        met_estimate: item.metEstimate,
        activity_type_id: item.resolution.type === 'existing' ? item.resolution.activityTypeId : undefined,
      }))
      const response = await validateCapture(capture.capture_id, {
        food_items: foodPayload,
        strength_items: strengthPayload,
        activity_items: activityPayload,
      })
      onDone(response)
    } catch {
      setError("Échec de l'enregistrement. Réessaie.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    await discardCapture(capture.capture_id).catch(() => {})
    onCancel()
  }

  const nothingDetected =
    activeFoodItems.length === 0 && activeExerciseGroups.length === 0 && activeActivityItems.length === 0

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4">
      <p className="text-sm text-ink-muted italic">« {capture.transcript} »</p>

      {nothingDetected && <p className="text-sm text-ink-muted">Rien détecté.</p>}

      {foodItems.map((item, index) =>
        item.removed ? null : (
          <FoodItemRow
            key={`food-${index}`}
            item={item}
            onChange={(updated) => updateFoodItem(index, updated)}
            onRemove={() => removeFoodItem(index)}
          />
        ),
      )}

      {exerciseGroups.map((group, index) =>
        group.removed ? null : (
          <ExerciseGroupCard
            key={`exercise-${index}`}
            group={group}
            onChange={(updated) => updateExerciseGroup(index, updated)}
            onRemove={() => removeExerciseGroup(index)}
          />
        ),
      )}

      {activityItems.map((item, index) =>
        item.removed ? null : (
          <ActivityItemRow
            key={`activity-${index}`}
            item={item}
            onChange={(updated) => updateActivityItem(index, updated)}
            onRemove={() => removeActivityItem(index)}
          />
        ),
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 rounded-full border border-border py-3 text-sm font-medium press-effect"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="flex-1 rounded-full bg-accent text-white py-3 text-sm font-medium disabled:opacity-40 press-effect"
        >
          {submitting ? 'Enregistrement...' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}
