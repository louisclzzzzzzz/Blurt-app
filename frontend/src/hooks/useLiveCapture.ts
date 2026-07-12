import { useCallback, useRef, useState } from 'react'
import { getWebSocketUrl } from '../api/client'

export type LiveCaptureStatus = 'idle' | 'connecting' | 'listening' | 'stopping' | 'stopped' | 'error'

export interface LiveTranscriptSegment {
  text: string
  start: number
  end: number
}

/** Item de brouillon tel que poussé par le serveur (add/modify) — pas encore
 * de matching catalogue (Phase 7C) : candidates/match_confidence viendront
 * s'y ajouter ensuite. */
export interface LiveDraftItem {
  item_id: string
  spoken_name: string
  quantity_grams: number | null
  quantity_units: number | null
  quantity_description: string | null
  is_packaged_product: boolean
}

interface LiveCaptureState {
  status: LiveCaptureStatus
  captureId: string | null
  partialText: string
  segments: LiveTranscriptSegment[]
  finalText: string | null
  draftItems: LiveDraftItem[]
  error: string | null
}

const WORKLET_URL = new URL('../worklets/pcm-downsampler-worklet.js', import.meta.url)
const TARGET_SAMPLE_RATE = 16000

const INITIAL_STATE: LiveCaptureState = {
  status: 'idle',
  captureId: null,
  partialText: '',
  segments: [],
  finalText: null,
  draftItems: [],
  error: null,
}

/** Capture micro en flux continu (AudioWorklet, PCM 16-bit/16kHz/mono) relayée
 * à WS /captures/stream — pilote dictée live nutrition, cf.
 * DICTEE_LIVE_NUTRITION.md. Pas MediaRecorder : il ne sort que de l'audio
 * compressé (Opus...), jamais du PCM brut attendu par Voxtral Realtime. */
export function useLiveCapture() {
  const [state, setState] = useState<LiveCaptureState>(INITIAL_STATE)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const cleanupAudio = useCallback(() => {
    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {})
    }
    audioContextRef.current = null
  }, [])

  const start = useCallback(async () => {
    setState({ ...INITIAL_STATE, status: 'connecting' })

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      await audioContext.audioWorklet.addModule(WORKLET_URL)

      const source = audioContext.createMediaStreamSource(stream)
      const workletNode = new AudioWorkletNode(audioContext, 'pcm-downsampler', {
        processorOptions: { targetSampleRate: TARGET_SAMPLE_RATE },
      })
      workletNodeRef.current = workletNode

      const ws = new WebSocket(getWebSocketUrl('/captures/stream'))
      wsRef.current = ws

      workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(event.data)
        }
      }

      ws.onopen = () => {
        source.connect(workletNode)
        // Relié à une destination silencieuse : Safari en particulier
        // suspend le traitement d'un noeud audio non relié à une sortie.
        const silentGain = audioContext.createGain()
        silentGain.gain.value = 0
        workletNode.connect(silentGain)
        silentGain.connect(audioContext.destination)
        setState((s) => ({ ...s, status: 'listening' }))
      }

      ws.onmessage = (event: MessageEvent<string>) => {
        const message = JSON.parse(event.data)
        setState((s) => {
          switch (message.type) {
            case 'capture_created':
              return { ...s, captureId: message.capture_id }
            case 'transcript_partial':
              return { ...s, partialText: s.partialText + message.text }
            case 'transcript_segment':
              return {
                ...s,
                segments: [...s.segments, { text: message.text, start: message.start, end: message.end }],
              }
            case 'transcript_done':
              return { ...s, finalText: message.text, partialText: '' }
            case 'draft_item_added':
              return { ...s, draftItems: [...s.draftItems, message.item] }
            case 'draft_item_updated':
              return {
                ...s,
                draftItems: s.draftItems.map((item) =>
                  item.item_id === message.item.item_id ? message.item : item,
                ),
              }
            case 'draft_item_removed':
              return {
                ...s,
                draftItems: s.draftItems.filter((item) => item.item_id !== message.item_id),
              }
            case 'stream_ended':
              return { ...s, status: 'stopped' }
            case 'error':
              return { ...s, status: 'error', error: message.message }
            default:
              return s
          }
        })
      }

      ws.onerror = () => {
        setState((s) => ({ ...s, status: 'error', error: 'Connexion perdue avec le serveur.' }))
      }

      ws.onclose = () => {
        cleanupAudio()
        setState((s) => (s.status === 'error' ? s : { ...s, status: 'stopped' }))
      }
    } catch {
      cleanupAudio()
      setState((s) => ({
        ...s,
        status: 'error',
        error: "Impossible d'accéder au micro. Vérifie les autorisations du navigateur.",
      }))
    }
  }, [cleanupAudio])

  /** Signale la fin de la dictée et arrête la capture micro. Le WS reste
   * ouvert côté client jusqu'à ce que le serveur le ferme (après avoir fini
   * de traiter l'audio déjà envoyé) — cf. `ws.onclose`. */
  const stop = useCallback(() => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'end' }))
      setState((s) => ({ ...s, status: 'stopping' }))
    }
    cleanupAudio()
  }, [cleanupAudio])

  return { ...state, start, stop }
}
