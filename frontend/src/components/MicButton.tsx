import { useEffect } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { Icon } from './Icon'

interface MicButtonProps {
  onRecorded: (blob: Blob, filename: string) => void
  onListeningChange?: (listening: boolean) => void
  disabled?: boolean
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
}

function extensionFor(mimeType: string): string {
  const base = mimeType.split(';')[0]
  return EXTENSION_BY_MIME[base] ?? 'webm'
}

export function MicButton({ onRecorded, onListeningChange, disabled }: MicButtonProps) {
  const { state, error, start, stop } = useAudioRecorder()
  const recording = state === 'recording'

  useEffect(() => {
    onListeningChange?.(recording)
  }, [recording, onListeningChange])

  const handleClick = async () => {
    if (recording) {
      const result = await stop()
      if (result) {
        onRecorded(result.blob, `capture.${extensionFor(result.mimeType)}`)
      }
    } else {
      await start()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="relative flex items-center justify-center size-36 shrink-0 disabled:opacity-40 press-effect"
        aria-label={recording ? 'Arrêter la dictée' : 'Démarrer la dictée'}
      >
        {!recording && !disabled && (
          <>
            <span className="absolute inset-0 rounded-full border border-accent/30 sound-ring" />
            <span className="absolute inset-0 rounded-full border border-accent/30 sound-ring [animation-delay:0.9s]" />
          </>
        )}
        <span
          className={`relative flex items-center justify-center size-24 rounded-full shadow-[0_8px_24px_-6px_rgb(0_0_0_/_0.35)] transition-colors ${
            recording ? 'bg-danger' : 'bg-accent'
          }`}
        >
          <Icon name="mic" className="size-10 text-white" />
        </span>
        {recording && (
          <span className="absolute top-2 right-6 size-3.5 rounded-full bg-danger border-2 border-bg animate-pulse" />
        )}
      </button>
      {!recording && !disabled && (
        <p className="text-sm text-ink-muted text-center">Appuyer pour enregistrer</p>
      )}
      {recording && <p className="text-sm text-danger text-center">Enregistrement en cours...</p>}
      {error && <p className="text-sm text-danger max-w-xs text-center">{error}</p>}
    </div>
  )
}
