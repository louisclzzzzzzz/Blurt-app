interface SegmentedTabsProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedTabs<T extends string>({ options, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="flex gap-1 p-1 rounded-full bg-surface-muted w-fit">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
            value === o.value ? 'bg-accent text-white' : 'text-ink-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
