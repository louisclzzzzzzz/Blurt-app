import type { IconName } from './Icon'
import { Icon } from './Icon'
import { HeaderWithBack } from './HeaderWithBack'

export interface DashboardButtonDef {
  key: string
  label: string
  description?: string
  icon: IconName
  onClick: () => void
}

interface DashboardScreenProps {
  title: string
  onBack: () => void
  buttons: DashboardButtonDef[]
}

export function DashboardScreen({ title, onBack, buttons }: DashboardScreenProps) {
  return (
    <div className="flex flex-col gap-5 w-full max-w-md px-4 py-4">
      <HeaderWithBack title={title} onBack={onBack} />
      <div className="grid grid-cols-2 gap-3">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={b.onClick}
            className="flex flex-col items-start gap-3 p-4 text-left rounded-2xl border border-border bg-surface press-effect"
          >
            <span className="flex items-center justify-center size-11 rounded-xl bg-accent-soft text-accent">
              <Icon name={b.icon} className="size-5" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{b.label}</span>
              {b.description && <span className="text-xs text-ink-muted">{b.description}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
