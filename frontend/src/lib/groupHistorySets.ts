import type { ExerciseRead } from '../types/catalogue'
import type { HistoryStrengthSetRead } from '../types/history'

export interface HistoryExerciseGroup {
  exercise: ExerciseRead
  sets: HistoryStrengthSetRead[]
}

/** Regroupe les séries d'une séance par exercice pour l'affichage — une série déjà
 * persistée a un exercise.id réel, donc pas besoin du regroupement flou par nom
 * dicté qu'utilise buildEditableExerciseGroups côté validation. */
export function groupHistorySets(sets: HistoryStrengthSetRead[]): HistoryExerciseGroup[] {
  const groups: HistoryExerciseGroup[] = []
  const indexByExerciseId = new Map<string, number>()

  for (const set of sets) {
    let index = indexByExerciseId.get(set.exercise.id)
    if (index === undefined) {
      index = groups.length
      indexByExerciseId.set(set.exercise.id, index)
      groups.push({ exercise: set.exercise, sets: [] })
    }
    groups[index].sets.push(set)
  }

  return groups
}
