import { useCallback, useRef, useState } from 'react'

type RecorderState = 'idle' | 'recording' | 'stopped'

// Safari/iOS ne supporte pas audio/webm via MediaRecorder — on détecte le
// format supporté à l'exécution plutôt que d'en imposer un.
const MIME_TYPE_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg']

function pickSupportedMimeType(): string {
  for (const type of MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

export interface RecordingResult {
  blob: Blob
  mimeType: string
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setState('recording')
    } catch {
      setError("Impossible d'accéder au micro. Vérifie les autorisations du navigateur.")
    }
  }, [])

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        streamRef.current?.getTracks().forEach((track) => track.stop())
        setState('stopped')
        resolve({ blob, mimeType })
      }
      recorder.stop()
    })
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setError(null)
  }, [])

  return { state, error, start, stop, reset }
}
