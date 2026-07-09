import { useEffect, useState } from 'react'
import { getHistory, getWeeklyMuscleVolume } from '../api/client'
import { addDays, formatDateISO, formatDateLabel, formatWeekLabel, mondayOf } from '../lib/dateNav'
import { MUSCLE_GROUP_LABELS } from '../types/catalogue'
import type { DayHistoryResponse } from '../types/history'
import type { WeeklyMuscleVolumeResponse } from '../types/volume'
import { HistoryActivityLogRow } from './HistoryActivityLogRow'
import { HistoryWorkoutCard } from './HistoryWorkoutCard'
import { SegmentedTabs } from './SegmentedTabs'

interface TrainingScreenProps {
  onClose: () => void
}

type TrainingTab = 'sessions' | 'volume'

const TRAINING_TABS: { value: TrainingTab; label: string }[] = [
  { value: 'sessions', label: 'Séances' },
  { value: 'volume', label: 'Volume & calories' },
]

function SessionsTab() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateISO(new Date()))
  const [history, setHistory] = useState<DayHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = () => {
    setLoading(true)
    setError(null)
    getHistory(selectedDate)
      .then(setHistory)
      .catch(() => setError("Échec du chargement de l'entraînement."))
      .finally(() => setLoading(false))
  }

  useEffect(refetch, [selectedDate])

  const nothingLogged =
    history !== null && history.workout_sessions.length === 0 && history.activity_logs.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, -1))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-sm"
        >
          ← Veille
        </button>
        <p className="text-sm capitalize">{formatDateLabel(selectedDate)}</p>
        <button
          type="button"
          onClick={() => setSelectedDate((d) => addDays(d, 1))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-sm"
        >
          Lendemain →
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500 animate-pulse">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {history && !loading && (
        <div className="flex flex-col gap-3">
          {nothingLogged && <p className="text-sm text-neutral-500">Rien loggé ce jour-là.</p>}
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

function VolumeTab() {
  const [weekStart, setWeekStart] = useState(() => formatDateISO(mondayOf(new Date())))
  const [data, setData] = useState<WeeklyMuscleVolumeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getWeeklyMuscleVolume(weekStart)
      .then(setData)
      .catch(() => setError('Échec du chargement du volume.'))
      .finally(() => setLoading(false))
  }, [weekStart])

  const maxSets = data ? Math.max(1, ...data.muscle_groups.map((g) => g.total_sets)) : 1
  const maxDailyCalories = data ? Math.max(1, ...data.daily_calories.map((d) => d.calories_kcal)) : 1

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-sm"
        >
          ← Semaine préc.
        </button>
        <p className="text-sm">{formatWeekLabel(weekStart)}</p>
        <button
          type="button"
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-1 text-sm"
        >
          Semaine suiv. →
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-500 animate-pulse">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && !loading && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
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

          <div className="flex flex-col gap-2">
            {data.muscle_groups.map((g) => (
              <div key={g.muscle_group} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3">
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
  const [tab, setTab] = useState<TrainingTab>('sessions')

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Entraînement</h2>
        <button type="button" onClick={onClose} className="text-xs text-neutral-400 underline">
          Fermer
        </button>
      </div>

      <SegmentedTabs options={TRAINING_TABS} value={tab} onChange={setTab} />

      {tab === 'sessions' ? <SessionsTab /> : <VolumeTab />}
    </div>
  )
}
