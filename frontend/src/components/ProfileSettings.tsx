import { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../api/client'
import type { UserProfile } from '../types/capture'
import { NutritionGoalsForm } from './NutritionGoalsForm'

interface ProfileSettingsProps {
  onClose: () => void
}

const EMPTY_PROFILE: UserProfile = {
  sex: 'male',
  birth_date: '',
  height_cm: 0,
  weight_kg: 0,
  calorie_goal_kcal: null,
  protein_goal_g: null,
  carbs_goal_g: null,
  fat_goal_g: null,
}

/** Profil biométrique mono-utilisateur : seule donnée saisie via un formulaire plutôt
 * que par dictée (données de configuration ponctuelles, pas un journal d'événements). */
export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p) setProfile(p)
      })
      .catch(() => setError('Échec du chargement du profil.'))
      .finally(() => setLoading(false))
  }, [])

  const canSave = profile.birth_date !== '' && profile.height_cm > 0 && profile.weight_kg > 0

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateProfile(profile)
      onClose()
    } catch {
      setError("Échec de l'enregistrement. Réessaie.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-500 py-8">Chargement...</p>

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="text-2xl press-effect">←</button>
        <h2 className="text-lg font-medium">Profil</h2>
      </div>
      <p className="text-sm text-neutral-500">
        Utilisé pour estimer les calories dépensées en musculation et en activité.
      </p>

      <div className="flex flex-col gap-3">
        <label className="text-sm flex flex-col gap-1">
          Sexe
          <select
            value={profile.sex}
            onChange={(e) => setProfile({ ...profile, sex: e.target.value as UserProfile['sex'] })}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
          >
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
        </label>

        <label className="text-sm flex flex-col gap-1">
          Date de naissance
          <input
            type="date"
            value={profile.birth_date}
            onChange={(e) => setProfile({ ...profile, birth_date: e.target.value })}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
          />
        </label>

        <label className="text-sm flex flex-col gap-1">
          Taille (cm)
          <input
            type="number"
            value={profile.height_cm || ''}
            onChange={(e) => setProfile({ ...profile, height_cm: Number(e.target.value) })}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
          />
        </label>

        <label className="text-sm flex flex-col gap-1">
          Poids (kg)
          <input
            type="number"
            value={profile.weight_kg || ''}
            onChange={(e) => setProfile({ ...profile, weight_kg: Number(e.target.value) })}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2"
          />
        </label>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">Objectifs nutritionnels</h3>
          <p className="text-xs text-neutral-500">
            Facultatif — utilisés pour le récap dans Nutrition. Aussi modifiables depuis le
            tableau de bord Nutrition.
          </p>
        </div>

        <NutritionGoalsForm profile={profile} onChange={setProfile} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 py-3 text-sm press-effect"
        >
          Fermer
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-500 text-white py-3 text-sm disabled:opacity-40 press-effect"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
