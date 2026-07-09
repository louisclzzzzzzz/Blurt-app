export type NavScreen = 'capture' | 'training' | 'nutrition' | 'catalogue' | 'profile'

interface TopNavProps {
  current: NavScreen
  onNavigate: (screen: NavScreen) => void
}

const NAV_ITEMS: { screen: NavScreen; label: string }[] = [
  { screen: 'capture', label: 'Accueil' },
  { screen: 'training', label: 'Entraînement' },
  { screen: 'nutrition', label: 'Nutrition' },
  { screen: 'catalogue', label: 'Catalogue' },
  { screen: 'profile', label: 'Profil' },
]

// UI standard (pas de pixel art ici) — seuls le personnage et le micro sont pixelisés.
export function TopNav({ current, onNavigate }: TopNavProps) {
  return (
    <nav className="w-full flex items-center justify-center gap-4 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.screen}
          type="button"
          onClick={() => onNavigate(item.screen)}
          className={`text-sm px-2 py-1 rounded-lg ${
            current === item.screen
              ? 'font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-400'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
