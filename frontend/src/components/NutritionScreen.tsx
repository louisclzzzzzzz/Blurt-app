import { useEffect, useState } from 'react'
import { getHistory, getProfile } from '../api/client'
import { addDays, formatDateISO, formatDateLabel } from '../lib/dateNav'
import type { UserProfile } from '../types/capture'
import type { DayHistoryResponse } from '../types/history'
import type { DashboardButtonDef } from './DashboardScreen'
import { DashboardScreen } from './DashboardScreen'
import { HeaderWithBack } from './HeaderWithBack'
import { HistoryMealCard } from './HistoryMealCard'
import { NutritionGoalsScreen } from './NutritionGoalsScreen'
import { NutritionSummary } from './NutritionSummary'

interface NutritionScreenProps {
  onClose: () => void
}

type NutritionSubScreen = 'meals' | 'summary' | 'goals'

function MealsScreen({ onBack }: { onBack: () => void }) {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()))
  const [history, setHistory] = useState<DayHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      <HeaderWithBack title="Repas du jour" onBack={onBack} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="rounded-full border border-border px-4 py-2 text-sm press-effect"
        >
          ← Veille
        </button>
        <p className="text-sm capitalize font-medium">{formatDateLabel(selectedDate)}</p>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="rounded-full border border-border px-4 py-2 text-sm press-effect"
        >
          Lendemain →
        </button>
      </div>

      {loading && <p className="text-sm text-ink-muted animate-pulse text-center py-4">Chargement...</p>}
      {error && <p className="text-sm text-danger text-center">{error}</p>}

      {history && !loading && (
        <div className="flex flex-col gap-3">
          {history.meals.length === 0 && <p className="text-sm text-ink-muted text-center py-4">Rien loggé ce jour-là.</p>}
          {history.meals.map((meal) => (
            <HistoryMealCard key={meal.id} meal={meal} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryScreen({ onBack }: { onBack: () => void }) {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()))
  const [history, setHistory] = useState<DayHistoryResponse | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    getHistory(selectedDate)
      .then(setHistory)
      .catch(() => setError('Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [selectedDate])

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Macros & calories" onBack={onBack} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="rounded-full border border-border px-4 py-2 text-sm press-effect"
        >
          ← Veille
        </button>
        <p className="text-sm capitalize font-medium">{formatDateLabel(selectedDate)}</p>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="rounded-full border border-border px-4 py-2 text-sm press-effect"
        >
          Lendemain →
        </button>
      </div>

      {loading && <p className="text-sm text-ink-muted animate-pulse text-center py-4">Chargement...</p>}
      {error && <p className="text-sm text-danger text-center">{error}</p>}

      {history && !loading && (
        <NutritionSummary consumptions={history.meals.flatMap((m) => m.consumptions)} goals={profile} />
      )}
    </div>
  )
}

export function NutritionScreen({ onClose }: NutritionScreenProps) {
  const [subScreen, setSubScreen] = useState<NutritionSubScreen | null>(null)

  if (subScreen === 'meals') return <MealsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === 'summary') return <SummaryScreen onBack={() => setSubScreen(null)} />
  if (subScreen === 'goals') return <NutritionGoalsScreen onBack={() => setSubScreen(null)} />

  const buttons: DashboardButtonDef[] = [
    { key: 'meals', label: 'Repas', icon: 'utensils', onClick: () => setSubScreen('meals') },
    { key: 'summary', label: 'Macros', icon: 'chart', onClick: () => setSubScreen('summary') },
    { key: 'goals', label: 'Objectifs', icon: 'target', onClick: () => setSubScreen('goals') },
  ]

  return <DashboardScreen title="Nutrition" onBack={onClose} buttons={buttons} />
}
