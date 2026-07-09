import { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../api/client'
import type { UserProfile } from '../types/capture'
import { HeaderWithBack } from './HeaderWithBack'
import { NutritionGoalsForm } from './NutritionGoalsForm'

interface NutritionGoalsScreenProps {
  onBack: () => void
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

export function NutritionGoalsScreen({ onBack }: NutritionGoalsScreenProps) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((p) => {
        if (p) setProfile(p)
      })
      .catch(() => setError('Échec du chargement des objectifs.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await updateProfile(profile)
      onBack()
    } catch {
      setError("Échec de l'enregistrement. Réessaie.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-neutral-500 py-8">Chargement...</p>

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Objectifs nutritionnels" onBack={onBack} />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <NutritionGoalsForm profile={profile} onChange={setProfile} />

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-blue-600 dark:bg-blue-500 text-white py-3 text-sm disabled:opacity-40 press-effect"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  )
}
