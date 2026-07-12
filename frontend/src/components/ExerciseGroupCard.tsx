import type { EditableExerciseGroup, EditableSet } from '../types/capture'
import { Icon } from './Icon'

interface ExerciseGroupCardProps {
  group: EditableExerciseGroup
  onChange: (updated: EditableExerciseGroup) => void
  onRemove: () => void
}

function emptySet(): EditableSet {
  return { reps: null, weightKg: null, rir: null }
}

export function ExerciseGroupCard({ group, onChange, onRemove }: ExerciseGroupCardProps) {
  if (group.removed) return null

  const selectedExerciseId = group.resolution.type === 'existing' ? group.resolution.exerciseId : null
  const selectedCandidate = group.candidates.find((c) => c.exercise_id === selectedExerciseId) ?? null

  // Aucune sélection de correspondance proposée : soit l'exercice a été
  // reconnu automatiquement (assigné directement), soit il ne l'a pas été et
  // c'est un nouvel exercice — jamais de liste à choisir.
  const resolutionSummary =
    group.resolution.type === 'existing' && selectedCandidate ? (
      <p className="text-sm">
        <span className="text-ink-muted">Correspondance : </span>
        <span className="font-medium">{selectedCandidate.name}</span>
      </p>
    ) : (
      <p className="text-sm text-ink-muted">Nouvel exercice</p>
    )

  const updateSet = (index: number, updated: EditableSet) => {
    onChange({ ...group, sets: group.sets.map((s, i) => (i === index ? updated : s)) })
  }
  const removeSet = (index: number) => {
    onChange({ ...group, sets: group.sets.filter((_, i) => i !== index) })
  }
  const addSet = () => onChange({ ...group, sets: [...group.sets, emptySet()] })

  const setField = (index: number, key: keyof EditableSet, label: string, width: string) => {
    const set = group.sets[index]
    return (
      <label className="text-xs flex items-center gap-1">
        {label}
        <input
          type="number"
          value={set[key] ?? ''}
          onChange={(e) =>
            updateSet(index, { ...set, [key]: e.target.value === '' ? null : Number(e.target.value) })
          }
          className={`${width} rounded-lg border border-border bg-surface-muted px-1 py-0.5 text-sm`}
        />
      </label>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{group.spoken_exercise_name}</p>
        <button type="button" onClick={onRemove} className="text-xs text-danger shrink-0">
          Retirer l'exercice
        </button>
      </div>

      {resolutionSummary}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-ink-muted">
          {group.sets.length} série{group.sets.length > 1 ? 's' : ''} (répétitions, poids et RIR facultatifs)
        </p>
        {group.sets.map((_, index) => (
          <div key={index} className="flex items-center gap-2 pl-2 border-l-2 border-border">
            <span className="text-xs text-ink-muted w-4">{index + 1}</span>
            {setField(index, 'reps', 'Reps', 'w-14')}
            {setField(index, 'weightKg', 'Kg', 'w-16')}
            {setField(index, 'rir', 'RIR', 'w-14')}
            <button type="button" onClick={() => removeSet(index)} className="text-danger ml-auto p-1">
              <Icon name="close" className="size-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addSet} className="text-xs text-left text-accent w-fit">
          + ajouter une série
        </button>
      </div>
    </div>
  )
}
