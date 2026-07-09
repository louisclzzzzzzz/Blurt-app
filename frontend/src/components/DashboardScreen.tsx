import { HeaderWithBack } from './HeaderWithBack'

export interface DashboardButtonDef {
  key: string
  label: string
  description?: string
  icon: string
  onClick: () => void
}

interface DashboardScreenProps {
  title: string
  onBack: () => void
  buttons: DashboardButtonDef[]
}

export function DashboardScreen({ title, onBack, buttons }: DashboardScreenProps) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title={title} onBack={onBack} />

      <div className="grid grid-cols-2 gap-3">
        {buttons.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={b.onClick}
            className="mobile-card press-effect flex flex-col items-center gap-1 p-4 text-center"
          >
            <span className="text-2xl">{b.icon}</span>
            <span className="text-sm font-medium">{b.label}</span>
            {b.description && <span className="text-xs text-neutral-500">{b.description}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
