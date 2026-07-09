interface SegmentedTabsProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedTabs<T extends string>({ options, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-sm px-3 py-1 rounded-lg border border-neutral-300 dark:border-neutral-600 ${
            value === o.value ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : ''
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
