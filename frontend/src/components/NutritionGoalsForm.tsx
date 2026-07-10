import type { UserProfile } from '../types/capture'

interface NutritionGoalsFormProps {
  profile: UserProfile
  onChange: (profile: UserProfile) => void
}

const numOrNull = (v: string): number | null => (v === '' ? null : Number(v))

/** Champs purs (pas de fetch/save) — réutilisés dans ProfileSettings et l'écran
 * "Objectifs nutritionnels" de Nutrition, qui gèrent chacun leur propre sauvegarde. */
export function NutritionGoalsForm({ profile, onChange }: NutritionGoalsFormProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="text-sm flex flex-col gap-1">
        Calories (kcal/jour)
        <input
          type="number"
          value={profile.calorie_goal_kcal ?? ''}
          onChange={(e) => onChange({ ...profile, calorie_goal_kcal: numOrNull(e.target.value) })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="text-sm flex flex-col gap-1">
        Protéines (g/jour)
        <input
          type="number"
          value={profile.protein_goal_g ?? ''}
          onChange={(e) => onChange({ ...profile, protein_goal_g: numOrNull(e.target.value) })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="text-sm flex flex-col gap-1">
        Glucides (g/jour)
        <input
          type="number"
          value={profile.carbs_goal_g ?? ''}
          onChange={(e) => onChange({ ...profile, carbs_goal_g: numOrNull(e.target.value) })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
        />
      </label>

      <label className="text-sm flex flex-col gap-1">
        Lipides (g/jour)
        <input
          type="number"
          value={profile.fat_goal_g ?? ''}
          onChange={(e) => onChange({ ...profile, fat_goal_g: numOrNull(e.target.value) })}
          className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
        />
      </label>
    </div>
  )
}
