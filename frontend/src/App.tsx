import { useEffect, useMemo, useState } from 'react'
import { createCapture, createCaptureFromText, getHealth } from './api/client'
import { CatalogueScreen } from './components/CatalogueScreen'
import type { CharacterState } from './components/CharacterDisplay'
import { CharacterDisplay } from './components/CharacterDisplay'
import { MicButton } from './components/MicButton'
import { NutritionScreen } from './components/NutritionScreen'
import { ProfileSettings } from './components/ProfileSettings'
import { TextCaptureInput } from './components/TextCaptureInput'
import { TopNav } from './components/TopNav'
import { TrainingScreen } from './components/TrainingScreen'
import { ValidationScreen } from './components/ValidationScreen'
import type { CaptureCreateResponse, ValidateCaptureResponse } from './types/capture'

type BackendStatus = 'checking' | 'ok' | 'error'
type FlowState = 'idle' | 'uploading' | 'validating' | 'done' | 'error'
type Screen = 'capture' | 'profile' | 'training' | 'nutrition' | 'catalogue'

function App() {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [flow, setFlow] = useState<FlowState>('idle')
  const [capture, setCapture] = useState<CaptureCreateResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ValidateCaptureResponse | null>(null)
  const [screen, setScreen] = useState<Screen>('capture')
  const [isListening, setIsListening] = useState(false)

  // Le personnage reflète le pipeline de capture réel là où l'info existe déjà
  // (flow d'upload/validation) ; "listening" vient de l'état du micro (MicButton).
  const characterState: CharacterState = useMemo(() => {
    if (flow === 'uploading') return 'processing'
    if (flow === 'validating') return 'confirming'
    if (isListening) return 'listening'
    return 'idle'
  }, [flow, isListening])

  useEffect(() => {
    getHealth()
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('error'))
  }, [])

  const handleRecorded = async (blob: Blob, filename: string) => {
    setFlow('uploading')
    setErrorMessage(null)
    try {
      const response = await createCapture(blob, filename)
      setCapture(response)
      setFlow('validating')
    } catch {
      setErrorMessage("Échec du traitement de la dictée. Vérifie ta connexion et réessaie.")
      setFlow('error')
    }
  }

  const handleTextSubmit = async (transcript: string) => {
    setFlow('uploading')
    setErrorMessage(null)
    try {
      const response = await createCaptureFromText(transcript)
      setCapture(response)
      setFlow('validating')
    } catch {
      setErrorMessage("Échec du traitement du texte. Réessaie.")
      setFlow('error')
    }
  }

  const reset = () => {
    setCapture(null)
    setLastResult(null)
    setFlow('idle')
  }

  const totalCalories = lastResult
    ? (lastResult.workout_session_calories_kcal ?? 0) +
      lastResult.activity_logs.reduce((sum, log) => sum + (log.calories_kcal ?? 0), 0)
    : 0

  if (screen === 'profile') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-6 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 p-6">
        <ProfileSettings onClose={() => setScreen('capture')} />
      </div>
    )
  }

  if (screen === 'training') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-6 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 p-6">
        <TrainingScreen onClose={() => setScreen('capture')} />
      </div>
    )
  }

  if (screen === 'nutrition') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-6 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 p-6">
        <NutritionScreen onClose={() => setScreen('capture')} />
      </div>
    )
  }

  if (screen === 'catalogue') {
    return (
      <div className="min-h-svh flex flex-col items-center justify-center gap-6 bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 p-6">
        <CatalogueScreen onClose={() => setScreen('capture')} />
      </div>
    )
  }

  return (
    <div className="min-h-svh flex flex-col bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <TopNav current={screen} onNavigate={setScreen} />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <CharacterDisplay state={characterState} className="w-full max-w-xs" />

        {flow === 'idle' && (
          <>
            <MicButton onRecorded={handleRecorded} onListeningChange={setIsListening} />
            <TextCaptureInput onSubmit={handleTextSubmit} />
            <p className="text-sm text-neutral-500 flex items-center gap-2">
              <span
                className={`inline-block size-2 rounded-full ${
                  backendStatus === 'ok'
                    ? 'bg-green-500'
                    : backendStatus === 'error'
                      ? 'bg-red-500'
                      : 'bg-neutral-400 animate-pulse'
                }`}
              />
              {backendStatus === 'checking' && 'Connexion au backend...'}
              {backendStatus === 'ok' && 'Backend connecté'}
              {backendStatus === 'error' && 'Backend injoignable'}
            </p>
          </>
        )}

        {flow === 'uploading' && (
          <p className="text-sm text-neutral-500 animate-pulse">Transcription et analyse en cours...</p>
        )}

        {flow === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-red-500 max-w-xs text-center">{errorMessage}</p>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-2 text-sm"
            >
              Réessayer
            </button>
          </div>
        )}

        {flow === 'validating' && capture && (
          <ValidationScreen
            capture={capture}
            onDone={(response) => {
              setLastResult(response)
              setFlow('done')
            }}
            onCancel={reset}
          />
        )}

        {flow === 'done' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm">Enregistré.</p>
            {totalCalories > 0 && (
              <p className="text-sm text-neutral-500">≈ {totalCalories.toFixed(0)} kcal dépensées</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 text-white px-4 py-2 text-sm"
            >
              Nouvelle dictée
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
