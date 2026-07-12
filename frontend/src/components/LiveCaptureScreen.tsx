import { useLiveCapture } from '../hooks/useLiveCapture'
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

/** Pilote dictée live (nutrition uniquement) — cf. DICTEE_LIVE_NUTRITION.md.
 * Phase 7B : la liste d'aliments se construit en direct (add/modify/remove),
 * pas encore de matching catalogue (Phase 7C) ni de FoodItemRow (Phase 7D).
 * Écran additif : ne remplace pas MicButton, qui reste le flux par défaut
 * pour tous les domaines. */
export function LiveCaptureScreen({ onClose }: LiveCaptureScreenProps) {
  const { status, partialText, draftItems, finalText, error, start, stop } = useLiveCapture()

  const isListening = status === 'listening' || status === 'connecting'

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack
        title="Dictée live (nutrition)"
        subtitle="Pilote — bêta"
        onBack={onClose}
      />

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
        {draftItems.map((item) => (
          <div
            key={item.item_id}
            className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3"
          >
            <p className="font-medium text-sm">{item.spoken_name}</p>
            {item.quantity_description && (
              <p className="text-xs text-neutral-500">{item.quantity_description}</p>
            )}
          </div>
        ))}
        {draftItems.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-6">
            Les aliments dictés apparaîtront ici au fur et à mesure...
          </p>
        )}
      </div>

      <details className="text-xs text-neutral-500">
        <summary className="cursor-pointer">Transcription brute</summary>
        <p className="mt-2">{finalText ?? (partialText || '—')}</p>
      </details>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={isListening ? stop : start}
          className={`rounded-lg px-6 py-3 text-sm font-medium press-effect ${
            isListening
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 dark:bg-blue-500 text-white'
          }`}
        >
          {isListening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
        </button>
      </div>
    </div>
  )
}
