import { useEffect, useState } from 'react'
import { createCapture, getHealth } from './api/client'
import { CatalogueScreen } from './components/CatalogueScreen'
import { LoadingScreen } from './components/LoadingScreen'
import { MicButton } from './components/MicButton'
import { MobileNav } from './components/MobileNav'
import { NutritionScreen } from './components/NutritionScreen'
import { ProfileSettings } from './components/ProfileSettings'
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

  const checkBackendHealth = () => {
    setBackendStatus('checking')
    getHealth()
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('error'))
  }

  useEffect(() => {
    checkBackendHealth()
  }, [])

  // Retour automatique au micro après confirmation, pour ne pas exiger un tap
  // "Nouvelle dictée" à chaque cycle de capture répété (repas suivant, série suivante...).
  useEffect(() => {
    if (flow !== 'done') return
    const timer = setTimeout(() => {
      setCapture(null)
      setLastResult(null)
      setFlow('idle')
    }, 1500)
    return () => clearTimeout(timer)
  }, [flow])

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

  const reset = () => {
    setCapture(null)
    setLastResult(null)
    setFlow('idle')
  }

  const totalCalories = lastResult
    ? (lastResult.workout_session_calories_kcal ?? 0) +
      lastResult.activity_logs.reduce((sum, log) => sum + (log.calories_kcal ?? 0), 0)
    : 0

  const renderScreenContent = () => {
    switch (screen) {
      case 'profile':
        return <ProfileSettings onClose={() => setScreen('capture')} />
      case 'training':
        return <TrainingScreen onClose={() => setScreen('capture')} />
      case 'nutrition':
        return <NutritionScreen onClose={() => setScreen('capture')} />
      case 'catalogue':
        return <CatalogueScreen onClose={() => setScreen('capture')} />
      default:
        return (
          <div className="flex flex-col min-h-full w-full max-w-md mx-auto px-4 py-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-center">Blurt</h1>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
              {flow === 'idle' && <MicButton onRecorded={handleRecorded} />}

              {flow === 'uploading' && (
                <p className="text-sm text-ink-muted animate-pulse">Analyse en cours...</p>
              )}

              {flow === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-danger max-w-xs text-center">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full border border-border px-6 py-2.5 text-sm font-medium press-effect"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {flow === 'validating' && capture && (
                <div className="w-full rounded-2xl border border-border bg-surface p-3 max-h-[70vh] overflow-y-auto mobile-scrollbar">
                  <ValidationScreen
                    capture={capture}
                    onDone={(response) => {
                      setLastResult(response)
                      setFlow('done')
                    }}
                    onCancel={reset}
                  />
                </div>
              )}

              {flow === 'done' && (
                <div className="flex flex-col items-center gap-3">
                  <span className="flex items-center justify-center size-11 rounded-full bg-accent-soft text-accent">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <p className="text-sm font-medium">Enregistré</p>
                  {totalCalories > 0 && (
                    <p className="text-sm text-ink-muted">≈ {totalCalories.toFixed(0)} kcal</p>
                  )}
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full bg-accent text-white px-6 py-2.5 text-sm font-medium press-effect"
                  >
                    Nouvelle dictée
                  </button>
                </div>
              )}
            </div>
          </div>
        )
    }
  }

  if (backendStatus !== 'ok') {
    return <LoadingScreen status={backendStatus} onRetry={checkBackendHealth} />
  }

  return (
    <div className="min-h-svh flex flex-col bg-bg text-ink safe-area-inset-top">
      <MobileNav current={screen} onNavigate={setScreen} />
      <main className="flex-1 overflow-y-auto mobile-scrollbar pb-24">
        {renderScreenContent()}
      </main>
    </div>
  )
}

export default App
