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
      className={`shrink-0 rounded p-1 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" strokeLinecap="round" />
        <path
          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
