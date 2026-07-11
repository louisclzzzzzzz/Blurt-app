interface LoadingScreenProps {
  status: 'checking' | 'error'
  onRetry: () => void
}

export function LoadingScreen({ status, onRetry }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-neutral-50 dark:bg-neutral-950 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Blurt</h1>

      {status === 'checking' && (
        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="size-2 rounded-full bg-neutral-400 animate-pulse" />
          Connexion au serveur...
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-red-500 text-center">Connexion impossible.</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 text-sm press-effect"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
