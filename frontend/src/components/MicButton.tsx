import { useEffect } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

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

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 10a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
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
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="relative flex items-center justify-center size-32 shrink-0 disabled:opacity-40 press-effect"
        aria-label={recording ? 'Arrêter la dictée' : 'Démarrer la dictée'}
      >
        {!recording && (
          <span className="absolute inset-[-15%] rounded-full mic-glow bg-blue-500/15" />
        )}
        <span
          className={`relative flex items-center justify-center size-full rounded-full shadow-md transition-colors ${
            recording ? 'bg-red-600' : 'bg-blue-600'
          }`}
        >
          <MicIcon className="size-12 text-white" />
        </span>
        {recording && (
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 border-2 border-neutral-50 dark:border-neutral-950 animate-pulse" />
        )}
      </button>
      {!recording && !disabled && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center">Appuyer pour enregistrer</p>
      )}
      {error && <p className="text-sm text-red-500 max-w-xs text-center">{error}</p>}
    </div>
  )
}
