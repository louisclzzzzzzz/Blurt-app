import { useState } from 'react'
import { deleteSet, deleteWorkoutSession, updateSet } from '../api/client'
import { groupHistorySets } from '../lib/groupHistorySets'
import type { HistoryStrengthSetRead, HistoryWorkoutSessionRead } from '../types/history'

interface HistoryWorkoutCardProps {
  session: HistoryWorkoutSessionRead
  onChanged: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryWorkoutCard({ session, onChanged }: HistoryWorkoutCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ reps: '', weightKg: '', rir: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const groups = groupHistorySets(session.sets)
  const timeRange = session.ended_at
    ? `${formatTime(session.started_at)}–${formatTime(session.ended_at)}`
    : formatTime(session.started_at)

  const startEdit = (set: HistoryStrengthSetRead) => {
    setEditingId(set.id)
    setDraft({
      reps: set.reps === null ? '' : String(set.reps),
      weightKg: set.weight_kg === null ? '' : String(set.weight_kg),
      rir: set.rir === null ? '' : String(set.rir),
    })
    setError(null)
  }

  const saveEdit = async () => {
    if (editingId === null) return
    setBusy(true)
    setError(null)
    try {
      await updateSet(session.id, editingId, {
        reps: draft.reps === '' ? null : Number(draft.reps),
        weight_kg: draft.weightKg === '' ? null : Number(draft.weightKg),
        rir: draft.rir === '' ? null : Number(draft.rir),
      })
      setEditingId(null)
      onChanged()
    } catch {
      setError('Échec de la modification.')
    } finally {
      setBusy(false)
    }
  }

  const removeSet = async (setId: string) => {
    if (!window.confirm('Retirer cette série ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteSet(session.id, setId)
      onChanged()
    } catch {
      setError('Échec de la suppression.')
      setBusy(false)
    }
  }

  const removeSession = async () => {
    if (!window.confirm('Supprimer toute la séance ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteWorkoutSession(session.id)
      onChanged()
    } catch {
      setError('Échec de la suppression.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          Séance <span className="text-neutral-400 font-normal">· {timeRange}</span>
        </p>
        <div className="flex items-center gap-2">
          {session.calories_kcal !== null && (
            <p className="text-sm text-neutral-500">{session.calories_kcal.toFixed(0)} kcal</p>
          )}
          <button
            type="button"
            onClick={removeSession}
            disabled={busy}
            className="text-xs text-red-500 disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.exercise.id} className="flex flex-col gap-1">
            <p className="text-sm font-medium">{group.exercise.name}</p>
            {group.sets.map((set) =>
              editingId === set.id ? (
                <div key={set.id} className="flex items-center gap-1 pl-2 text-xs">
                  <input
                    type="number"
                    placeholder="reps"
                    value={draft.reps}
                    onChange={(e) => setDraft({ ...draft, reps: e.target.value })}
                    className="w-12 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5"
                  />
                  <input
                    type="number"
                    placeholder="kg"
                    value={draft.weightKg}
                    onChange={(e) => setDraft({ ...draft, weightKg: e.target.value })}
                    className="w-14 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5"
                  />
                  <input
                    type="number"
                    placeholder="RIR"
                    value={draft.rir}
                    onChange={(e) => setDraft({ ...draft, rir: e.target.value })}
                    className="w-12 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5"
                  />
                  <button type="button" onClick={saveEdit} disabled={busy} className="underline">
                    OK
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-neutral-400">
                    ×
                  </button>
                </div>
              ) : (
                <div
                  key={set.id}
                  className="flex items-center gap-3 text-sm text-neutral-500 pl-2 border-l-2 border-neutral-200 dark:border-neutral-700"
                >
                  <span className="w-4">{set.set_number}</span>
                  <button type="button" onClick={() => startEdit(set)} className="flex items-center gap-3 underline">
                    {set.reps !== null && <span>{set.reps} reps</span>}
                    {set.weight_kg !== null && <span>{set.weight_kg} kg</span>}
                    {set.rir !== null && <span>RIR {set.rir}</span>}
                    {set.reps === null && set.weight_kg === null && set.rir === null && <span>modifier</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSet(set.id)}
                    disabled={busy}
                    className="text-red-500 disabled:opacity-40 ml-auto"
                  >
                    ×
                  </button>
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
