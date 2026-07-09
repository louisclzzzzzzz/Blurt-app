import { useEffect, useState } from 'react'
import { getHistory, getProfile } from '../api/client'
import { addDays, formatDateISO, formatDateLabel } from '../lib/dateNav'
import type { UserProfile } from '../types/capture'
import type { DayHistoryResponse } from '../types/history'
import { HeaderWithBack } from './HeaderWithBack'
import { HistoryMealCard } from './HistoryMealCard'
import { NutritionSummary } from './NutritionSummary'
import { SegmentedTabs } from './SegmentedTabs'

interface NutritionScreenProps {
  onClose: () => void
}

type NutritionTab = 'meals' | 'summary'

const NUTRITION_TABS: { value: NutritionTab; label: string }[] = [
  { value: 'meals', label: 'Repas' },
  { value: 'summary', label: 'Récapitulatif' },
]

export function NutritionScreen({ onClose }: NutritionScreenProps) {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()))
  const [tab, setTab] = useState<NutritionTab>('meals')
  const [history, setHistory] = useState<DayHistoryResponse | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => {})
  }, [])

  const refetch = () => {
    setLoading(true)
    setError(null)
    getHistory(selectedDate)
      .then(setHistory)
      .catch(() => setError('Échec du chargement.'))
      .finally(() => setLoading(false))
  }

  useEffect(refetch, [selectedDate])

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Nutrition" onBack={onClose} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm press-effect"
        >
          ← Veille
        </button>
        <p className="text-sm capitalize font-medium">{formatDateLabel(selectedDate)}</p>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm press-effect"
        >
          Lendemain →
        </button>
      </div>

      <SegmentedTabs options={NUTRITION_TABS} value={tab} onChange={setTab} />

      {loading && <p className="text-sm text-neutral-500 animate-pulse text-center py-4">Chargement...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {history && !loading && (
        <div className="flex flex-col gap-3">
          {tab === 'meals' && (
            <>
              {history.meals.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">Rien loggé ce jour-là.</p>}
              {history.meals.map((meal) => (
                <HistoryMealCard key={meal.id} meal={meal} onChanged={refetch} />
              ))}
            </>
          )}

          {tab === 'summary' && (
            <NutritionSummary consumptions={history.meals.flatMap((m) => m.consumptions)} goals={profile} />
          )}
        </div>
      )}
    </div>
  )
}
