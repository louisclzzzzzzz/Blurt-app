export type IconName =
  | 'home'
  | 'dumbbell'
  | 'utensils'
  | 'book'
  | 'user'
  | 'chevronLeft'
  | 'chart'
  | 'target'
  | 'activity'
  | 'plus'
  | 'close'
  | 'check'
  | 'pencil'
  | 'trash'
  | 'mic'

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M4 10v4" />
      <path d="M6 8v8" />
      <path d="M18 8v8" />
      <path d="M20 10v4" />
      <path d="M8 12h8" />
    </>
  ),
  utensils: (
    <>
      <path d="M7 2v6a2 2 0 0 0 4 0V2" />
      <path d="M9 8v14" />
      <path d="M16 2c-1.7 1.3-1.7 6.7 0 8" />
      <path d="M16 2v20" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
    </>
  ),
  chevronLeft: <path d="M15 5 8 12l7 7" />,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  activity: <path d="M3 12h4l1.5-4L12 18l2-8 1.5 2H21" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="M5 13l4 4L19 7" />,
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 19v3" strokeLinecap="round" />
      <path d="M8 22h8" strokeLinecap="round" />
    </>
  ),
}

interface IconProps {
  name: IconName
  className?: string
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
