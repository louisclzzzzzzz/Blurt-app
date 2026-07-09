import { useState } from 'react'
import { deleteConsumption, deleteMeal, updateConsumption } from '../api/client'
import type { HistoryFoodConsumptionRead, HistoryMealEntryRead } from '../types/history'

interface HistoryMealCardProps {
  meal: HistoryMealEntryRead
  onChanged: () => void
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function HistoryMealCard({ meal, onChanged }: HistoryMealCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftGrams, setDraftGrams] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalKcal = meal.consumptions.reduce((sum, c) => sum + c.energy_kcal, 0)

  const startEdit = (c: HistoryFoodConsumptionRead) => {
    setEditingId(c.id)
    setDraftGrams(String(c.quantity_grams))
    setError(null)
  }

  const saveEdit = async () => {
    if (editingId === null) return
    const grams = Number(draftGrams)
    if (!grams || grams <= 0) return
    setBusy(true)
    setError(null)
    try {
      await updateConsumption(meal.id, editingId, grams)
      setEditingId(null)
      onChanged()
    } catch {
      setError('Échec de la modification.')
    } finally {
      setBusy(false)
    }
  }

  const removeConsumption = async (consumptionId: string) => {
    if (!window.confirm('Retirer cet aliment du repas ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteConsumption(meal.id, consumptionId)
      onChanged()
    } catch {
      setError('Échec de la suppression.')
      setBusy(false)
    }
  }

  const removeMeal = async () => {
    if (!window.confirm('Supprimer tout le repas ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteMeal(meal.id)
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
          {meal.meal_type ? MEAL_TYPE_LABELS[meal.meal_type] : 'Repas'}
          <span className="text-neutral-400 font-normal"> · {formatTime(meal.logged_at)}</span>
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-neutral-500">{totalKcal.toFixed(0)} kcal</p>
          <button
            type="button"
            onClick={removeMeal}
            disabled={busy}
            className="text-xs text-red-500 disabled:opacity-40"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {meal.consumptions.map((c) => (
          <div key={c.id} className="flex items-center justify-between text-sm gap-2">
            <span>
              {c.food_item.name}
              {c.food_item.brand ? ` (${c.food_item.brand})` : ''}
            </span>
            {editingId === c.id ? (
              <span className="flex items-center gap-1 shrink-0">
                <input
                  type="number"
                  value={draftGrams}
                  onChange={(e) => setDraftGrams(e.target.value)}
                  className="w-16 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-1 py-0.5 text-sm"
                />
                <button type="button" onClick={saveEdit} disabled={busy} className="text-xs underline">
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-neutral-400"
                >
                  ×
                </button>
              </span>
            ) : (
              <span className="text-neutral-500 shrink-0 pl-2 flex items-center gap-2">
                <button type="button" onClick={() => startEdit(c)} className="underline">
                  {c.quantity_grams.toFixed(0)} g · {c.energy_kcal.toFixed(0)} kcal
                </button>
                <button
                  type="button"
                  onClick={() => removeConsumption(c.id)}
                  disabled={busy}
                  className="text-red-500 disabled:opacity-40"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
