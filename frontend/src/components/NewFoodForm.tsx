import type { NewFoodInput } from '../types/capture'

interface NewFoodFormProps {
  food: NewFoodInput
  onChange: (food: NewFoodInput) => void
}

const FIELDS: Array<{ key: keyof NewFoodInput; label: string; required?: boolean }> = [
  { key: 'name', label: 'Nom' },
  { key: 'brand', label: 'Marque' },
  { key: 'energy_kcal', label: 'kcal / 100g', required: true },
  { key: 'protein_g', label: 'Protéines / 100g', required: true },
  { key: 'carbs_g', label: 'Glucides / 100g', required: true },
  { key: 'fat_g', label: 'Lipides / 100g', required: true },
  { key: 'saturated_fat_g', label: 'dont AG saturés' },
  { key: 'sugars_g', label: 'dont sucres' },
  { key: 'fiber_g', label: 'Fibres' },
  { key: 'salt_g', label: 'Sel' },
]

export function NewFoodForm({ food, onChange }: NewFoodFormProps) {
  const update = (key: keyof NewFoodInput, value: string) => {
    if (key === 'name' || key === 'brand') {
      onChange({ ...food, [key]: value })
      return
    }
    onChange({ ...food, [key]: value === '' ? null : Number(value) })
  }

  return (
    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-muted">
      {FIELDS.map(({ key, label, required }) => (
        <label key={key} className="text-xs flex flex-col gap-1 col-span-1">
          {label}
          {required ? ' *' : ''}
          <input
            type={key === 'name' || key === 'brand' ? 'text' : 'number'}
            value={(food[key] as string | number | null | undefined) ?? ''}
            onChange={(e) => update(key, e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
        </label>
      ))}
    </div>
  )
}
