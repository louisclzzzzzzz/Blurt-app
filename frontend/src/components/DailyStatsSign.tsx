const PIP_COUNT = 6
const DEFAULT_CALORIE_GOAL_KCAL = 2200
const DEFAULT_BURN_GOAL_KCAL = 500

interface DailyStatsSignProps {
  consumedKcal: number
  burnedKcal: number
  calorieGoalKcal: number | null
}

function Pips({ activeCount, icon, alt }: { activeCount: number; icon: string; alt: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: PIP_COUNT }).map((_, i) => (
        <img
          key={i}
          src={icon}
          alt={i === 0 ? alt : undefined}
          draggable={false}
          className={`w-6 h-6 [image-rendering:pixelated] select-none transition-all ${
            i < activeCount ? 'opacity-100' : 'opacity-40 grayscale'
          }`}
        />
      ))}
    </div>
  )
}

export function DailyStatsSign({ consumedKcal, burnedKcal, calorieGoalKcal }: DailyStatsSignProps) {
  const calorieGoal = calorieGoalKcal ?? DEFAULT_CALORIE_GOAL_KCAL
  const kcalPips = Math.max(0, Math.min(PIP_COUNT, Math.round((consumedKcal / calorieGoal) * PIP_COUNT)))
  const burnPips = Math.max(0, Math.min(PIP_COUNT, Math.round((burnedKcal / DEFAULT_BURN_GOAL_KCAL) * PIP_COUNT)))

  return (
    <div className="relative w-full max-w-[420px] px-4">
      <img
        src="/images/front/tab.svg"
        alt=""
        draggable={false}
        className="w-full h-auto select-none"
      />
      <div className="absolute inset-0 flex flex-col justify-center gap-3 px-[14%] py-[16%]">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[10px] text-[#4a3423]">KCALS</span>
          <Pips activeCount={kcalPips} icon="/images/front/meat2.svg" alt="Calories consommées" />
        </div>
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[10px] text-[#4a3423]">DÉPENSE</span>
          <Pips activeCount={burnPips} icon="/images/front/spark2.svg" alt="Calories dépensées" />
        </div>
      </div>
    </div>
  )
}
