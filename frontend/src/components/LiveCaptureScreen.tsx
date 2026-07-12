import { useEffect, useRef, useState } from 'react'
import { discardCapture, validateCapture } from '../api/client'
import type { LiveDraftItem } from '../hooks/useLiveCapture'
import { useLiveCapture } from '../hooks/useLiveCapture'
import { buildEditableFoodItem } from '../lib/buildEditableItems'
import type { EditableItem } from '../types/capture'
import { FoodItemRow } from './FoodItemRow'
import { HeaderWithBack } from './HeaderWithBack'

interface LiveCaptureScreenProps {
  onClose: () => void
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'Prêt',
  connecting: 'Connexion...',
  listening: 'À l\'écoute',
  stopping: 'Finalisation...',
  stopped: 'Terminé',
  error: 'Erreur',
}

function toEditableItem(draft: LiveDraftItem): EditableItem {
  return buildEditableFoodItem({ ...draft, off_candidates: [] })
}

/** Pilote dictée live (nutrition uniquement) — cf. DICTEE_LIVE_NUTRITION.md.
 * La liste d'aliments se construit en direct (add/modify/remove + matching,
 * Phases 7B/7C) et se rend éditable via FoodItemRow, réutilisé tel quel
 * (même composant que le flux batch ValidationScreen) pour la correction
 * manuelle en complément de la correction vocale. Fin de dictée -> réutilise
 * validateCapture sans modification, avec les items du brouillon local
 * comme payload. Écran additif : ne remplace pas MicButton, qui reste le
 * flux par défaut pour tous les domaines. */
export function LiveCaptureScreen({ onClose }: LiveCaptureScreenProps) {
  const { status, captureId, partialText, draftItems, finalText, error, start, stop } = useLiveCapture()

  const [editableItems, setEditableItems] = useState<Record<string, EditableItem>>({})
  const previousDraftByIdRef = useRef<Record<string, LiveDraftItem>>({})

  // Régénère l'état éditable uniquement pour les items dont la donnée
  // serveur a changé depuis le dernier rendu (nouvelle référence) —
  // préserve une édition manuelle en cours sur les autres plutôt que de
  // tout écraser à chaque nouvel évènement WS.
  useEffect(() => {
    setEditableItems((prev) => {
      const next: Record<string, EditableItem> = {}
      for (const draft of draftItems) {
        const previousDraft = previousDraftByIdRef.current[draft.item_id]
        next[draft.item_id] =
          previousDraft === draft && prev[draft.item_id] ? prev[draft.item_id] : toEditableItem(draft)
      }
      return next
    })
    previousDraftByIdRef.current = Object.fromEntries(draftItems.map((d) => [d.item_id, d]))
  }, [draftItems])

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isActive = status === 'idle' || status === 'connecting' || status === 'listening' || status === 'stopping'
  const isReviewing = status === 'stopped'

  const updateItem = (id: string, updated: EditableItem) => {
    setEditableItems((prev) => ({ ...prev, [id]: updated }))
  }
  const removeItem = (id: string) => {
    setEditableItems((prev) => ({ ...prev, [id]: { ...prev[id], removed: true } }))
  }

  const activeItems = Object.entries(editableItems).filter(([, item]) => !item.removed)
  const allReady = activeItems.every(
    ([, item]) => item.quantityGrams !== null && item.quantityGrams > 0 && item.resolution.type !== 'unresolved',
  )
  const canSubmit = activeItems.length > 0 && allReady

  const handleConfirm = async () => {
    if (!captureId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const foodItems = activeItems.map(([, item]) => ({
        spoken_name: item.spoken_name,
        quantity_grams: item.quantityGrams as number,
        food_item_id: item.resolution.type === 'existing' ? item.resolution.foodItemId : undefined,
        create_new_food: item.resolution.type === 'create_new' ? item.resolution.food : undefined,
      }))
      await validateCapture(captureId, { food_items: foodItems, strength_items: [], activity_items: [] })
      setDone(true)
    } catch {
      setSubmitError("Échec de l'enregistrement. Réessaie.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDiscard = async () => {
    if (captureId) await discardCapture(captureId).catch(() => {})
    onClose()
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4 items-center">
        <p className="text-sm font-medium">Enregistré.</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 text-sm press-effect"
        >
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title="Dictée live (nutrition)" subtitle="Pilote — bêta" onBack={onClose} />

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block size-2 rounded-full ${
            status === 'listening'
              ? 'bg-green-500 animate-pulse'
              : status === 'error'
                ? 'bg-red-500'
                : 'bg-neutral-400'
          }`}
        />
        {STATUS_LABEL[status] ?? status}
      </div>

      <div className="flex flex-col gap-2">
        {Object.entries(editableItems).map(([id, item]) =>
          item.removed ? null : (
            <FoodItemRow
              key={id}
              item={item}
              onChange={(updated) => updateItem(id, updated)}
              onRemove={() => removeItem(id)}
            />
          ),
        )}
        {activeItems.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-6">
            Les aliments dictés apparaîtront ici au fur et à mesure...
          </p>
        )}
      </div>

      <details className="text-xs text-neutral-500">
        <summary className="cursor-pointer">Transcription brute</summary>
        <p className="mt-2">{finalText ?? (partialText || '—')}</p>
      </details>

      {error && <p className="text-sm text-amber-600">{error}</p>}
      {submitError && <p className="text-sm text-red-500">{submitError}</p>}

      {isReviewing ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="flex-1 rounded-lg border border-neutral-300 dark:border-neutral-600 py-3 text-sm press-effect"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || submitting}
            className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-500 text-white py-3 text-sm disabled:opacity-40 press-effect"
          >
            {submitting ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      ) : !isActive ? (
        // status === 'error' sans jamais avoir eu de session utilisable
        // (mic refusé, connexion jamais établie) : pas de reprise pour ce
        // pilote, juste une nouvelle tentative complète.
        <div className="flex justify-center">
          <button
            type="button"
            onClick={start}
            className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-6 py-3 text-sm press-effect"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={status === 'stopping' ? undefined : status === 'listening' ? stop : start}
            disabled={status === 'stopping'}
            className={`rounded-lg px-6 py-3 text-sm font-medium press-effect disabled:opacity-40 ${
              status === 'listening' || status === 'stopping'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 dark:bg-blue-500 text-white'
            }`}
          >
            {status === 'listening' || status === 'stopping' ? 'Arrêter la dictée' : 'Démarrer la dictée'}
          </button>
        </div>
      )}
    </div>
  )
}
