import { useState } from 'react'
import type { EditableItem, ItemResolution, NewFoodInput, OffCandidate } from '../types/capture'
import { NewFoodForm } from './NewFoodForm'

function EditPencilButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Fermer la correction' : 'Corriger'}
      title={active ? 'Fermer la correction' : 'Corriger'}
      className={`shrink-0 rounded p-1 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" strokeLinecap="round" />
        <path
          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

interface FoodItemRowProps {
  item: EditableItem
  onChange: (updated: EditableItem) => void
  onRemove: () => void
}

function emptyNewFood(name: string): NewFoodInput {
  return { name, energy_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
}

function newFoodFromOff(candidate: OffCandidate): NewFoodInput {
  return {
    name: candidate.name,
    brand: candidate.brand,
    off_barcode: candidate.off_barcode,
    energy_kcal: candidate.energy_kcal,
    protein_g: candidate.protein_g,
    carbs_g: candidate.carbs_g,
    fat_g: candidate.fat_g,
    saturated_fat_g: candidate.saturated_fat_g,
    sugars_g: candidate.sugars_g,
    fiber_g: candidate.fiber_g,
    salt_g: candidate.salt_g,
  }
}

export function FoodItemRow({ item, onChange, onRemove }: FoodItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  if (item.removed) return null

  const groupName = `resolution-${item.spoken_name}`
  const selectedFoodId = item.resolution.type === 'existing' ? item.resolution.foodItemId : null
  const selectedCandidate = item.candidates.find((c) => c.food_item_id === selectedFoodId) ?? null
  const portion = selectedCandidate?.default_portion_grams ?? null

  const setResolution = (resolution: ItemResolution) => {
    // En changeant de correspondance, on recalcule le poids à partir du nombre
    // d'unités déjà saisi plutôt que de le laisser incohérent avec la nouvelle
    // portion (ex: "2" pommes -> "2" yaourts ne pèsent pas la même chose).
    if (resolution.type === 'existing' && item.quantityUnits !== null) {
      const candidate = item.candidates.find((c) => c.food_item_id === resolution.foodItemId)
      if (candidate?.default_portion_grams != null) {
        onChange({ ...item, resolution, quantityGrams: item.quantityUnits * candidate.default_portion_grams })
        return
      }
    }
    onChange({ ...item, resolution })
  }
  const setQuantity = (value: string) =>
    onChange({ ...item, quantityGrams: value === '' ? null : Number(value) })
  const setQuantityUnits = (value: string) => {
    const units = value === '' ? null : Number(value)
    onChange({
      ...item,
      quantityUnits: units,
      quantityGrams: units !== null && portion !== null ? units * portion : null,
    })
  }

  const isManualSelected = item.resolution.type === 'create_new' && !item.resolution.food.off_barcode
  const selectedOffBarcode =
    item.resolution.type === 'create_new' ? item.resolution.food.off_barcode : undefined

  const header = (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="font-medium">{item.spoken_name}</p>
        {item.quantity_description && (
          <p className="text-xs text-neutral-500">dicté : {item.quantity_description}</p>
        )}
      </div>
      <button type="button" onClick={onRemove} className="text-xs text-red-500 shrink-0">
        Retirer
      </button>
    </div>
  )

  const quantityField =
    portion !== null ? (
      <div className="flex flex-col gap-1">
        <label className="text-sm flex items-center gap-2">
          Nombre
          <input
            type="number"
            step="1"
            min="0"
            value={item.quantityUnits ?? ''}
            onChange={(e) => setQuantityUnits(e.target.value)}
            className="w-16 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1"
          />
          {selectedCandidate?.default_portion_label && (
            <span className="text-xs text-neutral-500">× {selectedCandidate.default_portion_label}</span>
          )}
        </label>
        <p className="text-xs text-neutral-500">
          {item.quantityGrams !== null ? `≈ ${item.quantityGrams.toFixed(0)} g au total` : 'nombre à confirmer'}
        </p>
      </div>
    ) : (
      <label className="text-sm flex items-center gap-2">
        Quantité (g)
        <input
          type="number"
          value={item.quantityGrams ?? ''}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1"
        />
        {item.quantityGrams === null && <span className="text-xs text-amber-600">poids à confirmer</span>}
      </label>
    )

  // Macros dictées : l'utilisateur crée un nouvel aliment de toutes pièces,
  // pas de choix à faire — le backend ne renvoie d'ailleurs aucun candidat
  // pour ce cas (cf. routers/captures.py::_resolve_food_item).
  if (item.dictated_macros && item.resolution.type === 'create_new') {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-3">
        {header}
        {quantityField}
        <p className="text-xs text-neutral-500">Macros dictées — nouvel aliment</p>
        <NewFoodForm
          food={item.resolution.food}
          onChange={(food) => setResolution({ type: 'create_new', food })}
        />
      </div>
    )
  }

  const hasAlternatives = item.candidates.length > 0 || item.off_candidates.length > 0

  // Pas de liste de suggestions par défaut : la transcription est fiable, on
  // affiche directement la résolution retenue (match exact ou nouvel aliment).
  // L'icône de modification révèle les alternatives pour corriger à la main
  // si ce n'est pas la bonne.
  const resolutionSummary =
    item.resolution.type === 'existing' && selectedCandidate ? (
      <p className="text-sm">
        <span className="text-neutral-500">Aliment reconnu : </span>
        <span className="font-medium">{selectedCandidate.name}</span>
        {selectedCandidate.brand ? ` (${selectedCandidate.brand})` : ''}
      </p>
    ) : item.resolution.type === 'create_new' ? (
      <p className="text-sm">
        <span className="text-neutral-500">Nouvel aliment : </span>
        <span className="font-medium">{item.resolution.food.name || item.spoken_name}</span>
        {item.resolution.food.brand ? ` (${item.resolution.food.brand})` : ''}
      </p>
    ) : null

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 flex flex-col gap-3">
      {header}
      {quantityField}

      <div className="flex items-center justify-between gap-2">
        {resolutionSummary}
        {hasAlternatives && <EditPencilButton active={isEditing} onClick={() => setIsEditing((v) => !v)} />}
      </div>

      {isEditing && item.candidates.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500">
            Correspondance{item.candidates.length > 1 ? 's possibles' : ''} :
          </p>
          {item.candidates.map((c) => (
            <label key={c.food_item_id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={groupName}
                checked={selectedFoodId === c.food_item_id}
                onChange={() => setResolution({ type: 'existing', foodItemId: c.food_item_id })}
              />
              {c.name} {c.brand ? `(${c.brand})` : ''} — {c.energy_kcal.toFixed(0)} kcal/100g
            </label>
          ))}
        </div>
      )}

      {isEditing && item.off_candidates.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-neutral-500">Trouvé sur Open Food Facts :</p>
          {item.off_candidates.map((c) => (
            <label key={c.off_barcode ?? c.name} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={groupName}
                checked={!!c.off_barcode && selectedOffBarcode === c.off_barcode}
                onChange={() => setResolution({ type: 'create_new', food: newFoodFromOff(c) })}
              />
              {c.name} {c.brand ? `(${c.brand})` : ''} — {c.energy_kcal.toFixed(0)} kcal/100g
            </label>
          ))}
        </div>
      )}

      {isEditing && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={groupName}
            checked={isManualSelected}
            onChange={() => setResolution({ type: 'create_new', food: emptyNewFood(item.spoken_name) })}
          />
          Nouvel aliment (saisie manuelle)
        </label>
      )}

      {item.resolution.type === 'create_new' && (
        <NewFoodForm
          food={item.resolution.food}
          onChange={(food) => setResolution({ type: 'create_new', food })}
        />
      )}
    </div>
  )
}
