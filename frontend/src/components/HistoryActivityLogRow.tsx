import { useState } from 'react'
import { deleteActivityLog, updateActivityLog } from '../api/client'
import type { HistoryActivityLogRead } from '../types/history'

interface HistoryActivityLogRowProps {
  log: HistoryActivityLogRead
  onChanged: () => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryActivityLogRow({ log, onChanged }: HistoryActivityLogRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ duration: '', distance: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setDraft({
      duration: log.duration_minutes === null ? '' : String(log.duration_minutes),
      distance: log.distance_km === null ? '' : String(log.distance_km),
    })
    setError(null)
    setEditing(true)
  }

  const saveEdit = async () => {
    setBusy(true)
    setError(null)
    try {
      await updateActivityLog(log.id, {
        duration_minutes: draft.duration === '' ? null : Number(draft.duration),
        distance_km: draft.distance === '' ? null : Number(draft.distance),
      })
      setEditing(false)
      onChanged()
    } catch {
      setError('Échec de la modification.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Supprimer cette activité ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteActivityLog(log.id)
      onChanged()
    } catch {
      setError('Échec de la suppression.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {log.activity_type.name}
          <span className="text-neutral-400 font-normal"> · {formatTime(log.logged_at)}</span>
        </p>
        <div className="flex items-center gap-2">
          {!editing && log.calories_kcal !== null && (
            <p className="text-sm text-neutral-500">{log.calories_kcal.toFixed(0)} kcal</p>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-xs text-red-500 disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            Durée (min)
            <input
              type="number"
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
              className="w-16 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5"
            />
          </label>
          <label className="flex items-center gap-1">
            Distance (km)
            <input
              type="number"
              value={draft.distance}
              onChange={(e) => setDraft({ ...draft, distance: e.target.value })}
              className="w-16 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5"
            />
          </label>
          <button type="button" onClick={saveEdit} disabled={busy} className="text-xs underline">
            OK
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-400">
            ×
          </button>
        </div>
      ) : (
        <button type="button" onClick={startEdit} className="text-sm text-neutral-500 text-left underline w-fit">
          {[
            log.duration_minutes !== null ? `${log.duration_minutes} min` : null,
            log.distance_km !== null ? `${log.distance_km} km` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'modifier'}
        </button>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
