import { Icon } from './Icon'

interface HeaderWithBackProps {
  title: string
  onBack: () => void
  subtitle?: string
}

export function HeaderWithBack({ title, onBack, subtitle }: HeaderWithBackProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="flex items-center justify-center size-9 -ml-1.5 rounded-full text-ink press-effect shrink-0"
        aria-label="Retour"
      >
        <Icon name="chevronLeft" className="size-5" />
      </button>
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  )
}
