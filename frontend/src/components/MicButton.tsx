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
        className={`relative w-[clamp(120px,32vw,190px)] h-[clamp(120px,32vw,190px)] shrink-0 disabled:opacity-40 press-effect ${
          recording ? '' : 'animate-mic-bounce'
        }`}
        aria-label={recording ? 'Arrêter la dictée' : 'Démarrer la dictée'}
      >
        <span
          className={`absolute inset-[-22%] rounded-full mic-glow ${
            recording
              ? 'bg-[radial-gradient(circle,rgba(239,68,68,0.55)_0%,transparent_70%)]'
              : 'bg-[radial-gradient(circle,rgba(242,169,60,0.55)_0%,transparent_70%)]'
          }`}
        />
        <img
          src="/images/front/mic.svg"
          alt={recording ? 'Arrêter la dictée' : 'Démarrer la dictée'}
          draggable={false}
          className="relative w-full h-full [image-rendering:pixelated] select-none"
        />
        {recording && (
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 border-2 border-[#2b1e06] animate-pulse" />
        )}
      </button>
      {!recording && !disabled && (
        <p className="font-pixel text-[10px] text-white text-pixel-outline text-center animate-pulse">
          Appuyer pour enregistrer
        </p>
      )}
      {error && <p className="text-sm text-red-500 max-w-xs text-center">{error}</p>}
    </div>
  )
}
