export type NavScreen = 'capture' | 'training' | 'nutrition' | 'catalogue' | 'profile'

interface MobileNavProps {
  current: NavScreen
  onNavigate: (screen: NavScreen) => void
}

const NAV_ITEMS: { screen: NavScreen; label: string; icon: string }[] = [
  { screen: 'capture', label: 'Accueil', icon: '🏠' },
  { screen: 'training', label: 'Entraînement', icon: '💪' },
  { screen: 'nutrition', label: 'Nutrition', icon: '🍎' },
  { screen: 'catalogue', label: 'Catalogue', icon: '📚' },
  { screen: 'profile', label: 'Profil', icon: '👤' },
]

export function MobileNav({ current, onNavigate }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 z-50">
      <div className="flex justify-around items-center py-2 px-4 safe-area-inset-bottom">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.screen}
            type="button"
            onClick={() => onNavigate(item.screen)}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
              current === item.screen
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
            aria-label={item.label}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
