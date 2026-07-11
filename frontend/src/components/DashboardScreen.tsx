import { HeaderWithBack } from './HeaderWithBack'

export interface DashboardButtonDef {
  key: string
  label: string
  description?: string
  /** Emoji ou caractère affiché comme icône du bouton. */
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
            className="flex flex-col items-center gap-2 p-4 text-center rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 press-effect"
          >
            <span className="text-3xl" aria-hidden="true">
              {b.icon}
            </span>
            <span className="text-sm font-medium">{b.label}</span>
            {b.description && <span className="text-xs text-neutral-500">{b.description}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
