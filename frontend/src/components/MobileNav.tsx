import type { IconName } from './Icon'
import { Icon } from './Icon'

export type NavScreen = 'capture' | 'training' | 'nutrition' | 'catalogue' | 'profile'

interface MobileNavProps {
  current: NavScreen
  onNavigate: (screen: NavScreen) => void
}

const NAV_ITEMS: { screen: NavScreen; label: string; icon: IconName }[] = [
  { screen: 'capture', label: 'Accueil', icon: 'home' },
  { screen: 'training', label: 'Muscu', icon: 'dumbbell' },
  { screen: 'nutrition', label: 'Nutrition', icon: 'utensils' },
  { screen: 'catalogue', label: 'Catalogue', icon: 'book' },
  { screen: 'profile', label: 'Profil', icon: 'user' },
]

export function MobileNav({ current, onNavigate }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
      <div className="flex justify-around items-stretch px-2 safe-area-inset-bottom">
        {NAV_ITEMS.map((item) => {
          const active = current === item.screen
          return (
            <button
              key={item.screen}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className="flex flex-col items-center gap-1 py-2.5 px-3 flex-1"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={`flex items-center justify-center size-8 rounded-full transition-colors ${
                  active ? 'bg-accent-soft text-accent' : 'text-ink-muted'
                }`}
              >
                <Icon name={item.icon} className="size-5" />
              </span>
              <span className={`text-[11px] leading-none ${active ? 'text-accent font-medium' : 'text-ink-muted'}`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
