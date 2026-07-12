import { useState } from 'react'
import { deleteSet, deleteWorkoutSession, updateSet } from '../api/client'
import { groupHistorySets } from '../lib/groupHistorySets'
import type { HistoryStrengthSetRead, HistoryWorkoutSessionRead } from '../types/history'
import { Icon } from './Icon'

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
    <div className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          Séance <span className="text-ink-muted font-normal">· {timeRange}</span>
        </p>
        <div className="flex items-center gap-3">
          {session.calories_kcal !== null && (
            <p className="text-sm text-ink-muted">{session.calories_kcal.toFixed(0)} kcal</p>
          )}
          <button
            type="button"
            onClick={removeSession}
            disabled={busy}
            className="text-xs text-danger disabled:opacity-40"
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
                <div key={set.id} className="flex items-center gap-2 pl-2 text-xs">
                  <input
                    type="number"
                    placeholder="reps"
                    value={draft.reps}
                    onChange={(e) => setDraft({ ...draft, reps: e.target.value })}
                    className="w-12 rounded-lg border border-border bg-surface-muted px-1 py-0.5"
                  />
                  <input
                    type="number"
                    placeholder="kg"
                    value={draft.weightKg}
                    onChange={(e) => setDraft({ ...draft, weightKg: e.target.value })}
                    className="w-14 rounded-lg border border-border bg-surface-muted px-1 py-0.5"
                  />
                  <input
                    type="number"
                    placeholder="RIR"
                    value={draft.rir}
                    onChange={(e) => setDraft({ ...draft, rir: e.target.value })}
                    className="w-12 rounded-lg border border-border bg-surface-muted px-1 py-0.5"
                  />
                  <button type="button" onClick={saveEdit} disabled={busy} className="text-accent">
                    <Icon name="check" className="size-4" />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="text-ink-muted">
                    <Icon name="close" className="size-4" />
                  </button>
                </div>
              ) : (
                <div key={set.id} className="flex items-center gap-3 text-sm text-ink-muted pl-2 border-l-2 border-border">
                  <span className="w-4">{set.set_number}</span>
                  <button type="button" onClick={() => startEdit(set)} className="flex items-center gap-3 underline decoration-border">
                    {set.reps !== null && <span>{set.reps} reps</span>}
                    {set.weight_kg !== null && <span>{set.weight_kg} kg</span>}
                    {set.rir !== null && <span>RIR {set.rir}</span>}
                    {set.reps === null && set.weight_kg === null && set.rir === null && <span>modifier</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSet(set.id)}
                    disabled={busy}
                    className="text-danger disabled:opacity-40 ml-auto"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
