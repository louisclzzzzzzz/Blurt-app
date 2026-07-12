import type { HistoryFoodConsumptionRead } from '../types/history'

interface Totals {
  energy_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

interface Goals {
  calorie_goal_kcal: number | null
  protein_goal_g: number | null
  carbs_goal_g: number | null
  fat_goal_g: number | null
}

interface NutritionSummaryProps {
  consumptions: HistoryFoodConsumptionRead[]
  goals: Goals | null
}

function sumTotals(consumptions: HistoryFoodConsumptionRead[]): Totals {
  return consumptions.reduce(
    (acc, c) => ({
      energy_kcal: acc.energy_kcal + c.energy_kcal,
      protein_g: acc.protein_g + c.protein_g,
      carbs_g: acc.carbs_g + c.carbs_g,
      fat_g: acc.fat_g + c.fat_g,
    }),
    { energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function CalorieRing({ total, goal }: { total: number; goal: number | null }) {
  const pct = goal !== null && goal > 0 ? Math.min(total / goal, 1.5) : null
  const dashOffset = pct !== null ? CIRCUMFERENCE * (1 - Math.min(pct, 1)) : CIRCUMFERENCE
  const overGoal = pct !== null && pct > 1

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="8" className="stroke-border" />
        {pct !== null && (
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className={overGoal ? 'stroke-danger' : 'stroke-accent'}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold tabular-nums">{total.toFixed(0)}</span>
        <span className="text-xs text-ink-muted">{goal !== null ? `/ ${goal.toFixed(0)} kcal` : 'kcal'}</span>
      </div>
    </div>
  )
}

function MacroBar({ label, value, goal }: { label: string; value: number; goal: number | null }) {
  const pct = goal !== null && goal > 0 ? Math.min((value / goal) * 100, 100) : null
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between text-xs">
        <span>{label}</span>
        <span className="text-ink-muted tabular-nums">
          {value.toFixed(0)}g{goal !== null ? ` / ${goal.toFixed(0)}g` : ''}
        </span>
      </div>
      {pct !== null && (
        <div className="h-2 rounded-full bg-surface-muted">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}

export function NutritionSummary({ consumptions, goals }: NutritionSummaryProps) {
  if (consumptions.length === 0) return null

  const totals = sumTotals(consumptions)

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-4">
      <CalorieRing total={totals.energy_kcal} goal={goals?.calorie_goal_kcal ?? null} />
      <div className="flex-1 flex flex-col gap-2">
        <MacroBar label="Protéines" value={totals.protein_g} goal={goals?.protein_goal_g ?? null} />
        <MacroBar label="Glucides" value={totals.carbs_g} goal={goals?.carbs_goal_g ?? null} />
        <MacroBar label="Lipides" value={totals.fat_g} goal={goals?.fat_goal_g ?? null} />
      </div>
    </div>
  )
}
