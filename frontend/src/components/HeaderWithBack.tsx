interface HeaderWithBackProps {
  title: string
  onBack: () => void
  subtitle?: string
}

export function HeaderWithBack({ title, onBack, subtitle }: HeaderWithBackProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-2xl press-effect" aria-label="Retour">
          ←
        </button>
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}
