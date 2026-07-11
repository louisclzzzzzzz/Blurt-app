import { useEffect, useState } from 'react'
import { createCapture, getHealth } from './api/client'
import { CatalogueScreen } from './components/CatalogueScreen'
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

  useEffect(() => {
    getHealth()
      .then(() => setBackendStatus('ok'))
      .catch(() => setBackendStatus('error'))
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
          <div className="flex flex-col min-h-full w-full max-w-md mx-auto px-4 py-6">
            <div className="flex flex-col items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Blurt</h1>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
                <span
                  className={`inline-block size-2 rounded-full ${
                    backendStatus === 'ok'
                      ? 'bg-green-500'
                      : backendStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-neutral-400 animate-pulse'
                  }`}
                />
                {backendStatus === 'checking' && 'Connexion...'}
                {backendStatus === 'ok' && 'Connecté'}
                {backendStatus === 'error' && 'Hors ligne'}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
              {flow === 'idle' && <MicButton onRecorded={handleRecorded} />}

              {flow === 'uploading' && (
                <p className="text-sm text-neutral-500 animate-pulse">Analyse en cours...</p>
              )}

              {flow === 'error' && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-red-500 max-w-xs text-center">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-6 py-2 text-sm press-effect"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              {flow === 'validating' && capture && (
                <div className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 max-h-[70vh] overflow-y-auto mobile-scrollbar">
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
                  <p className="text-sm font-medium">Enregistré.</p>
                  {totalCalories > 0 && (
                    <p className="text-sm text-neutral-500">≈ {totalCalories.toFixed(0)} kcal</p>
                  )}
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 text-sm press-effect"
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

  return (
    <div className="min-h-svh flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 safe-area-inset-top">
      <MobileNav current={screen} onNavigate={setScreen} />
      <main className="flex-1 overflow-y-auto mobile-scrollbar">
        {renderScreenContent()}
      </main>
    </div>
  )
}

export default App
