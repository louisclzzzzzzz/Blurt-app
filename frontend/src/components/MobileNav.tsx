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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#3a2418] safe-area-inset-bottom">
      <div className="relative">
        <img
          src="/images/objets/banniere_menu.png"
          alt=""
          draggable={false}
          className="block w-full h-auto select-none [image-rendering:pixelated]"
        />
        <div className="absolute inset-0 flex items-center justify-around px-6">
          {NAV_ITEMS.map((item) => {
            const isActive = current === item.screen
            return (
              <button
                key={item.screen}
                type="button"
                onClick={() => onNavigate(item.screen)}
                className={`press-effect flex flex-col items-center gap-0.5 transition-transform duration-150 ${
                  isActive ? 'scale-110' : 'opacity-70'
                }`}
                aria-label={item.label}
              >
                <span className="text-xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">{item.icon}</span>
                <span className="font-pixel text-pixel-outline text-white text-[9px] leading-tight whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
