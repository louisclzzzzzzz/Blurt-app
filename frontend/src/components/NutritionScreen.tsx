import { useEffect, useState } from 'react'
import { getHistory, getProfile } from '../api/client'
import { useCoverAnchor } from '../hooks/useCoverAnchor'
import { addDays, formatDateISO, formatDateLabel } from '../lib/dateNav'
import type { UserProfile } from '../types/capture'
import type { DayHistoryResponse } from '../types/history'
import { HeaderWithBack } from './HeaderWithBack'
import { HistoryMealCard } from './HistoryMealCard'
import { NutritionGoalsScreen } from './NutritionGoalsScreen'
import { NutritionSummary } from './NutritionSummary'

interface NutritionScreenProps {
  onClose: () => void
}

type NutritionSubScreen = 'meals' | 'summary' | 'goals'

interface ShelfButtonDef {
  key: string
  label: string
  icon: string
  /** Ancrage en % de la scène (centre de l'icône). */
  xPercent: number
  yPercent: number
  /** Multiplicateur de taille — compense les icônes dont le dessin occupe moins de place dans son canevas. */
  sizeMultiplier: number
  onClick: () => void
}

const SHELF_BUTTONS_ANCHORS: Omit<ShelfButtonDef, 'onClick'>[] = [
  { key: 'meals', label: 'Repas', icon: '/images/objets/boutons/meal_icone.png', xPercent: 22, yPercent: 29, sizeMultiplier: 1 },
  { key: 'summary', label: 'Macros', icon: '/images/objets/boutons/macro_icone.png', xPercent: 50, yPercent: 29, sizeMultiplier: 1.45 },
  { key: 'goals', label: 'Objectifs', icon: '/images/objets/boutons/goal_icone.png', xPercent: 78, yPercent: 29, sizeMultiplier: 1 },
]

function KitchenScene({
  onBack,
  onSelectMeals,
  onSelectSummary,
  onSelectGoals,
}: {
  onBack: () => void
  onSelectMeals: () => void
  onSelectSummary: () => void
  onSelectGoals: () => void
}) {
  const handlers: Record<string, () => void> = {
    meals: onSelectMeals,
    summary: onSelectSummary,
    goals: onSelectGoals,
  }
  const buttons: ShelfButtonDef[] = SHELF_BUTTONS_ANCHORS.map((b) => ({ ...b, onClick: handlers[b.key] }))
  // Dimensions réelles de kitchen2.png : l'ancrage % est calculé sur l'image d'origine,
  // pas sur le viewport, pour rester exact quel que soit le format d'écran (cf. useCoverAnchor).
  const { containerRef, anchorStyle, scale } = useCoverAnchor(1536, 2752)
  const baseIconSize = scale * 460

  return (
    <div ref={containerRef} className="relative isolate min-h-svh overflow-hidden">
      <img
        src="/images/menus/nutri/kitchen2.png"
        alt=""
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover -z-10 select-none [image-rendering:pixelated]"
      />

      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={onBack} className="text-2xl text-white drop-shadow press-effect" aria-label="Retour">
          ←
        </button>
        <h2 className="font-pixel text-xs text-white text-pixel-outline">Nutrition</h2>
      </div>

      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={b.onClick}
          style={{ ...anchorStyle(b.xPercent, b.yPercent), width: Math.max(84, baseIconSize * b.sizeMultiplier) }}
          className="flex flex-col items-center gap-1 press-effect transition-transform duration-200 ease-out hover:scale-110 active:scale-95"
        >
          <span className="font-pixel text-[9px] leading-tight text-white text-pixel-outline text-center">
            {b.label}
          </span>
          <img
            src={b.icon}
            alt=""
            draggable={false}
            className="w-full h-auto aspect-square object-contain [image-rendering:pixelated] select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]"
          />
        </button>
      ))}
    </div>
  )
}

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
          {history.meals.length === 0 && <p className="text-sm text-neutral-500 text-center py-4">Rien loggé ce jour-là.</p>}
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

  return (
    <KitchenScene
      onBack={onClose}
      onSelectMeals={() => setSubScreen('meals')}
      onSelectSummary={() => setSubScreen('summary')}
      onSelectGoals={() => setSubScreen('goals')}
    />
  )
}
