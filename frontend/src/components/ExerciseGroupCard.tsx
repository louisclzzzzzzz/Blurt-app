import { useState } from 'react'
import type { EditableExerciseGroup, EditableSet, ExerciseResolution } from '../types/capture'
import { EditPencilButton } from './EditPencilButton'

interface ExerciseGroupCardProps {
  group: EditableExerciseGroup
  onChange: (updated: EditableExerciseGroup) => void
  onRemove: () => void
}

function emptySet(): EditableSet {
  return { reps: null, weightKg: null, rir: null }
}

export function ExerciseGroupCard({ group, onChange, onRemove }: ExerciseGroupCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  if (group.removed) return null

  const groupName = `exercise-${group.spoken_exercise_name}`
  const setResolution = (resolution: ExerciseResolution) => onChange({ ...group, resolution })
  const selectedExerciseId = group.resolution.type === 'existing' ? group.resolution.exerciseId : null
  const selectedCandidate = group.candidates.find((c) => c.exercise_id === selectedExerciseId) ?? null
  const isCreatingNew = group.resolution.type === 'create_new'
  const hasAlternatives = group.candidates.length > 0

  // Pas de liste de suggestions par défaut : on affiche directement la résolution
  // retenue (match exact ou nouvel exercice). L'icône de modification révèle les
  // alternatives pour corriger à la main si ce n'est pas la bonne.
  const resolutionSummary =
    group.resolution.type === 'existing' && selectedCandidate ? (
      <p className="text-sm">
        <span className="text-neutral-500">Exercice reconnu : </span>
        <span className="font-medium">{selectedCandidate.name}</span>
      </p>
    ) : (
      <p className="text-sm">
        <span className="text-neutral-500">Nouvel exercice : </span>
        <span className="font-medium">{group.spoken_exercise_name}</span>
      </p>
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
          className={`${width} rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5 text-sm`}
        />
      </label>
    )
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium">{group.spoken_exercise_name}</p>
        <button type="button" onClick={onRemove} className="text-xs text-red-500 shrink-0">
          Retirer l'exercice
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {resolutionSummary}
        {hasAlternatives && <EditPencilButton active={isEditing} onClick={() => setIsEditing((v) => !v)} />}
      </div>

      {isEditing && group.candidates.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500">
            Correspondance{group.candidates.length > 1 ? 's possibles' : ''} :
          </p>
          {group.candidates.map((c) => (
            <label key={c.exercise_id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={groupName}
                checked={selectedExerciseId === c.exercise_id}
                onChange={() => setResolution({ type: 'existing', exerciseId: c.exercise_id })}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}

      {isEditing && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={groupName}
            checked={isCreatingNew}
            onChange={() => setResolution({ type: 'create_new' })}
          />
          Nouvel exercice : « {group.spoken_exercise_name} »
        </label>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs text-neutral-500">
          {group.sets.length} série{group.sets.length > 1 ? 's' : ''} (répétitions, poids et RIR facultatifs)
        </p>
        {group.sets.map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-2 pl-2 border-l-2 border-neutral-200 dark:border-neutral-700"
          >
            <span className="text-xs text-neutral-400 w-4">{index + 1}</span>
            {setField(index, 'reps', 'Reps', 'w-14')}
            {setField(index, 'weightKg', 'Kg', 'w-16')}
            {setField(index, 'rir', 'RIR', 'w-14')}
            <button type="button" onClick={() => removeSet(index)} className="text-xs text-red-500 ml-auto">
              ×
            </button>
          </div>
        ))}
        <button type="button" onClick={addSet} className="text-xs text-left text-neutral-500 underline">
          + ajouter une série
        </button>
      </div>
    </div>
  )
}
