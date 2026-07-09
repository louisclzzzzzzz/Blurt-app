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

export function MicButton({ onRecorded, onListeningChange, disabled }: MicButtonProps) {
  const { state, error, start, stop } = useAudioRecorder()

  useEffect(() => {
    onListeningChange?.(state === 'recording')
  }, [state, onListeningChange])

  const handleClick = async () => {
    if (state === 'recording') {
      const result = await stop()
      if (result) {
        onRecorded(result.blob, `capture.${extensionFor(result.mimeType)}`)
      }
    } else {
      await start()
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`relative size-24 shrink-0 disabled:opacity-40 press-effect ${
          state === 'recording' ? 'animate-pulse drop-shadow-[0_0_16px_rgba(242,169,60,0.8)]' : ''
        }`}
        aria-label={state === 'recording' ? 'Arrêter la dictée' : 'Démarrer la dictée'}
      >
        <img
          src="/images/front/mic.svg"
          alt={state === 'recording' ? 'Arrêter la dictée' : 'Démarrer la dictée'}
          draggable={false}
          className="w-full h-full [image-rendering:pixelated] select-none"
        />
        {state === 'recording' && (
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 border-2 border-[#2b1e06] animate-pulse" />
        )}
      </button>
      {error && <p className="text-sm text-red-500 max-w-xs text-center">{error}</p>}
    </div>
  )
}
