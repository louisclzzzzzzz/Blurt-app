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

/** Pilote dictée live (nutrition uniquement) — Phase 7A : affiche la
 * transcription Voxtral Realtime au fur et à mesure, sans extraction ni
 * matching (à venir en 7B/7C). Écran additif : ne remplace pas MicButton,
 * qui reste le flux par défaut pour tous les domaines. */
export function LiveCaptureScreen({ onClose }: LiveCaptureScreenProps) {
  const { status, partialText, segments, finalText, error, start, stop } = useLiveCapture()

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

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 min-h-40 flex flex-col gap-2">
        {segments.map((segment, i) => (
          <p key={i} className="text-sm">
            {segment.text}
          </p>
        ))}
        {partialText && <p className="text-sm text-neutral-500">{partialText}</p>}
        {finalText && !partialText && segments.length === 0 && <p className="text-sm">{finalText}</p>}
        {!partialText && !finalText && segments.length === 0 && (
          <p className="text-sm text-neutral-400">La transcription apparaîtra ici au fur et à mesure...</p>
        )}
      </div>

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
