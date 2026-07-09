import { useEffect, useState } from 'react'
import {
  deleteActivityAlias,
  deleteExerciseAlias,
  deleteFoodAlias,
  getActivityDetail,
  getExerciseDetail,
  getFoodDetail,
  updateActivity,
  updateExercise,
  updateFood,
} from '../api/client'
import type { ActivityTypeDetailRead, ExerciseDetailRead, FoodDetailRead, MuscleGroup } from '../types/catalogue'
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS } from '../types/catalogue'
import type { CatalogueDomain } from './CatalogueScreen'
import { MergePicker } from './MergePicker'

interface CatalogueEntryDetailProps {
  domain: CatalogueDomain
  entryId: string
  onBack: () => void
}

type Detail = FoodDetailRead | ExerciseDetailRead | ActivityTypeDetailRead

interface Draft {
  name: string
  brand: string
  energy_kcal: string
  protein_g: string
  carbs_g: string
  fat_g: string
  saturated_fat_g: string
  sugars_g: string
  fiber_g: string
  salt_g: string
  default_portion_label: string
  default_portion_grams: string
  equipment: string
  target_muscles: MuscleGroup[]
  met_value: string
}

const orEmpty = (v: number | string | null): string => (v === null ? '' : String(v))
const orNull = (v: string): string | null => (v === '' ? null : v)
const numOrNull = (v: string): number | null => (v === '' ? null : Number(v))

function draftFrom(domain: CatalogueDomain, detail: Detail): Draft {
  const base: Draft = {
    name: detail.name,
    brand: '',
    energy_kcal: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    saturated_fat_g: '',
    sugars_g: '',
    fiber_g: '',
    salt_g: '',
    default_portion_label: '',
    default_portion_grams: '',
    equipment: '',
    target_muscles: [],
    met_value: '',
  }
  if (domain === 'food') {
    const food = detail as FoodDetailRead
    return {
      ...base,
      brand: orEmpty(food.brand),
      energy_kcal: String(food.energy_kcal),
      protein_g: String(food.protein_g),
      carbs_g: String(food.carbs_g),
      fat_g: String(food.fat_g),
      saturated_fat_g: orEmpty(food.saturated_fat_g),
      sugars_g: orEmpty(food.sugars_g),
      fiber_g: orEmpty(food.fiber_g),
      salt_g: orEmpty(food.salt_g),
      default_portion_label: orEmpty(food.default_portion_label),
      default_portion_grams: orEmpty(food.default_portion_grams),
    }
  }
  if (domain === 'exercise') {
    const exercise = detail as ExerciseDetailRead
    return {
      ...base,
      equipment: orEmpty(exercise.equipment),
      target_muscles: exercise.target_muscles,
      met_value: orEmpty(exercise.met_value),
    }
  }
  const activity = detail as ActivityTypeDetailRead
  return { ...base, met_value: orEmpty(activity.met_value) }
}

async function fetchDetail(domain: CatalogueDomain, id: string): Promise<Detail> {
  if (domain === 'food') return getFoodDetail(id)
  if (domain === 'exercise') return getExerciseDetail(id)
  return getActivityDetail(id)
}

async function deleteAliasFor(domain: CatalogueDomain, id: string, aliasId: string): Promise<void> {
  if (domain === 'food') return deleteFoodAlias(id, aliasId)
  if (domain === 'exercise') return deleteExerciseAlias(id, aliasId)
  return deleteActivityAlias(id, aliasId)
}

const FOOD_FIELDS: Array<[keyof Draft, string, boolean]> = [
  ['brand', 'Marque', false],
  ['energy_kcal', 'kcal / 100g', true],
  ['protein_g', 'Protéines / 100g', true],
  ['carbs_g', 'Glucides / 100g', true],
  ['fat_g', 'Lipides / 100g', true],
  ['saturated_fat_g', 'dont AG saturés', true],
  ['sugars_g', 'dont sucres', true],
  ['fiber_g', 'Fibres', true],
  ['salt_g', 'Sel', true],
  ['default_portion_label', 'Libellé portion', false],
  ['default_portion_grams', 'Portion (g)', true],
]

export function CatalogueEntryDetail({ domain, entryId, onBack }: CatalogueEntryDetailProps) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [showMerge, setShowMerge] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    fetchDetail(domain, entryId)
      .then(setDetail)
      .catch(() => setError('Échec du chargement.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [domain, entryId])

  const startEdit = () => {
    if (detail === null) return
    setDraft(draftFrom(domain, detail))
    setError(null)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (draft === null) return
    setBusy(true)
    setError(null)
    try {
      if (domain === 'food') {
        await updateFood(entryId, {
          name: draft.name,
          brand: orNull(draft.brand),
          energy_kcal: Number(draft.energy_kcal),
          protein_g: Number(draft.protein_g),
          carbs_g: Number(draft.carbs_g),
          fat_g: Number(draft.fat_g),
          saturated_fat_g: numOrNull(draft.saturated_fat_g),
          sugars_g: numOrNull(draft.sugars_g),
          fiber_g: numOrNull(draft.fiber_g),
          salt_g: numOrNull(draft.salt_g),
          default_portion_label: orNull(draft.default_portion_label),
          default_portion_grams: numOrNull(draft.default_portion_grams),
        })
      } else if (domain === 'exercise') {
        await updateExercise(entryId, {
          name: draft.name,
          equipment: orNull(draft.equipment),
          target_muscles: draft.target_muscles,
          met_value: numOrNull(draft.met_value),
        })
      } else {
        await updateActivity(entryId, { name: draft.name, met_value: numOrNull(draft.met_value) })
      }
      setEditing(false)
      load()
    } catch {
      setError('Échec de la modification.')
    } finally {
      setBusy(false)
    }
  }

  const removeAlias = async (aliasId: string) => {
    if (!window.confirm('Supprimer cet alias ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteAliasFor(domain, entryId, aliasId)
      load()
    } catch {
      setError('Échec de la suppression.')
    } finally {
      setBusy(false)
    }
  }

  if (showMerge && detail !== null) {
    return (
      <MergePicker
        domain={domain}
        sourceId={entryId}
        sourceName={detail.name}
        onMerged={onBack}
        onCancel={() => setShowMerge(false)}
      />
    )
  }

  const food = domain === 'food' && detail ? (detail as FoodDetailRead) : null
  const exercise = domain === 'exercise' && detail ? (detail as ExerciseDetailRead) : null
  const activity = domain === 'activity' && detail ? (detail as ActivityTypeDetailRead) : null

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4">
      <button type="button" onClick={onBack} className="text-xs text-neutral-400 underline w-fit">
        ← Retour
      </button>

      {loading && <p className="text-sm text-neutral-500 animate-pulse">Chargement...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {detail && !loading && !editing && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{detail.name}</h2>
            <button type="button" onClick={startEdit} className="text-xs underline">
              Modifier
            </button>
          </div>

          {food && (
            <p className="text-sm text-neutral-500">
              {food.brand && `${food.brand} · `}
              {food.energy_kcal.toFixed(0)} kcal · {food.protein_g.toFixed(1)}g prot. ·{' '}
              {food.carbs_g.toFixed(1)}g gluc. · {food.fat_g.toFixed(1)}g lip. (pour 100g)
              {food.default_portion_label &&
                ` · portion : ${food.default_portion_label} (${food.default_portion_grams}g)`}
            </p>
          )}
          {exercise && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-neutral-500">
                {exercise.equipment && `${exercise.equipment} · `}
                {exercise.met_value !== null ? `MET ${exercise.met_value}` : 'MET inconnu'}
              </p>
              {exercise.target_muscles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {exercise.target_muscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-neutral-300 dark:border-neutral-600 px-2 py-0.5 text-xs"
                    >
                      {MUSCLE_GROUP_LABELS[m]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {activity && (
            <p className="text-sm text-neutral-500">
              {activity.met_value !== null ? `MET ${activity.met_value}` : 'MET inconnu'}
            </p>
          )}

          <div className="flex flex-col gap-1">
            <p className="text-xs text-neutral-500">Alias appris :</p>
            {detail.aliases.length === 0 && <p className="text-xs text-neutral-400">Aucun.</p>}
            {detail.aliases.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.alias_text}</span>
                <button
                  type="button"
                  onClick={() => removeAlias(a.id)}
                  disabled={busy}
                  className="text-xs text-red-500 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowMerge(true)}
            className="text-sm text-left underline text-neutral-500 w-fit"
          >
            Fusionner...
          </button>
        </div>
      )}

      {editing && draft && (
        <div className="flex flex-col gap-2">
          <label className="text-sm flex flex-col gap-1">
            Nom
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1"
            />
          </label>

          {domain === 'food' && (
            <div className="grid grid-cols-2 gap-2">
              {FOOD_FIELDS.map(([key, label, isNumber]) => (
                <label key={key} className="text-xs flex flex-col gap-1">
                  {label}
                  <input
                    type={isNumber ? 'number' : 'text'}
                    value={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                    className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
                  />
                </label>
              ))}
            </div>
          )}

          {domain === 'exercise' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs flex flex-col gap-1">
                Équipement
                <input
                  type="text"
                  value={draft.equipment}
                  onChange={(e) => setDraft({ ...draft, equipment: e.target.value })}
                  className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
                />
              </label>
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-xs">Groupes musculaires ciblés</span>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.map((m) => (
                    <label key={m} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={draft.target_muscles.includes(m)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            target_muscles: e.target.checked
                              ? [...draft.target_muscles, m]
                              : draft.target_muscles.filter((x) => x !== m),
                          })
                        }
                      />
                      {MUSCLE_GROUP_LABELS[m]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-xs flex flex-col gap-1">
                MET
                <input
                  type="number"
                  value={draft.met_value}
                  onChange={(e) => setDraft({ ...draft, met_value: e.target.value })}
                  className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
                />
              </label>
            </div>
          )}

          {domain === 'activity' && (
            <label className="text-xs flex flex-col gap-1">
              MET
              <input
                type="number"
                value={draft.met_value}
                onChange={(e) => setDraft({ ...draft, met_value: e.target.value })}
                className="rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
              />
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 py-2 text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={busy}
              className="flex-1 rounded-lg bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 text-white py-2 text-sm disabled:opacity-40"
            >
              {busy ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
