import { Icon } from './Icon'

interface EditPencilButtonProps {
  onClick: () => void
  active: boolean
}

export function EditPencilButton({ onClick, active }: EditPencilButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Fermer la correction' : 'Corriger'}
      title={active ? 'Fermer la correction' : 'Corriger'}
      className={`shrink-0 rounded-full p-1.5 ${active ? 'text-accent bg-accent-soft' : 'text-ink-muted'}`}
    >
      <Icon name="pencil" className="size-3.5" />
    </button>
  )
}
