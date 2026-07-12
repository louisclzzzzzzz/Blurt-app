interface LoadingScreenProps {
  status: 'checking' | 'error'
  onRetry: () => void
}

export function LoadingScreen({ status, onRetry }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Blurt</h1>

      {status === 'checking' && (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <span className="flex gap-1">
            <span className="size-1.5 rounded-full bg-accent animate-pulse [animation-delay:0s]" />
            <span className="size-1.5 rounded-full bg-accent animate-pulse [animation-delay:0.2s]" />
            <span className="size-1.5 rounded-full bg-accent animate-pulse [animation-delay:0.4s]" />
          </span>
          Connexion au serveur...
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-danger text-center">Connexion impossible.</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-accent text-white px-6 py-2.5 text-sm font-medium press-effect"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
