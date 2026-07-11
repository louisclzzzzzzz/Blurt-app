import { useEffect, useState } from 'react'
import { getHistory, getWeeklyMuscleVolume } from '../api/client'
import { addDays, formatDateISO, formatDateLabel, formatWeekLabel, mondayOf } from '../lib/dateNav'
import { MUSCLE_GROUP_LABELS } from '../types/catalogue'
import type { DayHistoryResponse } from '../types/history'
import type { WeeklyMuscleVolumeResponse } from '../types/volume'
import type { DashboardButtonDef } from './DashboardScreen'
import { DashboardScreen } from './DashboardScreen'
import { HeaderWithBack } from './HeaderWithBack'
import { HistoryActivityLogRow } from './HistoryActivityLogRow'
import { HistoryWorkoutCard } from './HistoryWorkoutCard'

interface TrainingScreenProps {
  onClose: () => void
}

type TrainingSubScreen = 'sessions' | 'volume'

function SessionsScreen({ onBack }: { onBack: () => void }) {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()))
  const [history, setHistory] = useState<DayHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = () => {
    setLoading(true)
    setError(null)
    getHistory(selectedDate)
      .then(setHistory)
      .catch(() => setError("Échec du chargement."))
      .finally(() => setLoading(false))
  }

  useEffect(refetch, [selectedDate])

  const nothingLogged =
    history !== null && history.workout_sessions.length === 0 && history.activity_logs.length === 0

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Séances du jour" onBack={onBack} />

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

      {loading && <p className="text-sm text-neutral-500 animate-pulse text-center py-4">Chargement...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {history && !loading && (
        <div className="flex flex-col gap-3">
          {nothingLogged && <p className="text-sm text-neutral-500 text-center py-4">Rien loggé ce jour-là.</p>}
          {history.workout_sessions.map((session) => (
            <HistoryWorkoutCard key={session.id} session={session} onChanged={refetch} />
          ))}
          {history.activity_logs.map((log) => (
            <HistoryActivityLogRow key={log.id} log={log} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}

function VolumeScreen({ onBack }: { onBack: () => void }) {
  const [weekStart, setWeekStart] = useState(() => formatDateISO(mondayOf(new Date())))
  const [data, setData] = useState<WeeklyMuscleVolumeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getWeeklyMuscleVolume(weekStart)
      .then(setData)
      .catch(() => setError('Échec du chargement.'))
      .finally(() => setLoading(false))
  }, [weekStart])

  const maxSets = data ? Math.max(1, ...data.muscle_groups.map((g) => g.total_sets)) : 1
  const maxDailyCalories = data ? Math.max(1, ...data.daily_calories.map((d) => d.calories_kcal)) : 1

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Volume hebdomadaire" onBack={onBack} />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm press-effect"
        >
          ← Semaine préc.
        </button>
        <p className="text-sm font-medium">{formatWeekLabel(weekStart)}</p>
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm press-effect"
        >
          Semaine suiv. →
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500 animate-pulse text-center py-4">Chargement...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {data && !loading && (
        <div className="flex flex-col gap-4">
          <div className="mobile-card">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">Calories brûlées</span>
              <span className="text-neutral-500 text-xs">{data.total_calories_kcal.toFixed(0)} kcal</span>
            </div>
            <div className="mt-2 flex items-end gap-1 h-12">
              {data.daily_calories.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    title={`${d.date} : ${d.calories_kcal.toFixed(0)} kcal`}
                    className="w-full rounded bg-emerald-500 dark:bg-emerald-400"
                    style={{ height: `${Math.max((d.calories_kcal / maxDailyCalories) * 100, d.calories_kcal > 0 ? 8 : 2)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {data.muscle_groups.map((g) => (
              <div key={g.muscle_group} className="mobile-card">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{MUSCLE_GROUP_LABELS[g.muscle_group]}</span>
                  <span className="text-neutral-500 text-xs">{g.total_sets} séries</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"
                    style={{ width: `${(g.total_sets / maxSets) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex gap-1">
                  {g.daily_counts.map((d) => {
                    const opacity = d.sets === 0 ? 0.15 : Math.min(0.3 + d.sets * 0.25, 1)
                    return (
                      <div
                        key={d.date}
                        title={`${d.date} : ${d.sets} série${d.sets > 1 ? 's' : ''}`}
                        className="w-4 h-4 rounded bg-emerald-500 dark:bg-emerald-400"
                        style={{ opacity }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function TrainingScreen({ onClose }: TrainingScreenProps) {
  const [subScreen, setSubScreen] = useState<TrainingSubScreen | null>(null)

  if (subScreen === 'sessions') return <SessionsScreen onBack={() => setSubScreen(null)} />
  if (subScreen === 'volume') return <VolumeScreen onBack={() => setSubScreen(null)} />

  const buttons: DashboardButtonDef[] = [
    {
      key: 'sessions',
      label: 'Séances',
      icon: '🏋️',
      onClick: () => setSubScreen('sessions'),
    },
    {
      key: 'volume',
      label: 'Historique',
      icon: '📈',
      onClick: () => setSubScreen('volume'),
    },
  ]

  return <DashboardScreen title="Entraînement" onBack={onClose} buttons={buttons} />
}
