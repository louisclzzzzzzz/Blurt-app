const BAR_SEGMENTS = 10

interface LoadingScreenProps {
  status: 'checking' | 'error'
  onRetry: () => void
}

export function LoadingScreen({ status, onRetry }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-[#0e150d] px-6">
      <div className="pointer-events-none absolute inset-0 mic-glow bg-[radial-gradient(circle_at_50%_38%,rgba(95,127,76,0.22),transparent_60%)]" />

      <h1 className="font-pixel text-pixel-outline text-[clamp(2.25rem,11vw,3.5rem)] leading-none text-center bg-gradient-to-b from-[#a9c98f] to-[#5f7f4c] bg-clip-text text-transparent">
        Blurt
      </h1>

      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-1 border-4 border-[#1c2b1a] bg-[#141d10] p-1 shadow-[0_3px_0_#050805]">
          {Array.from({ length: BAR_SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className="h-4 w-3 bg-[#23301d] animate-pixel-load"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>

        <p className="font-pixel text-[0.6rem] text-[#a9c98f] text-center leading-relaxed">
          {status === 'checking' ? 'Connexion au serveur...' : 'Connexion impossible'}
        </p>
      </div>

      {status === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="font-pixel text-[0.6rem] border-2 border-[#1c2b1a] bg-[#5f7f4c] text-[#0e150d] px-5 py-3 press-effect shadow-[0_3px_0_#1c2b1a]"
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
