import { HeaderWithBack } from './HeaderWithBack'

export interface DashboardButtonDef {
  key: string
  label: string
  description?: string
  icon: string
  onClick: () => void
}

interface DashboardScreenProps {
  title: string
  onBack: () => void
  buttons: DashboardButtonDef[]
  /** Image de fond plein cadre (ex. décor pixel-art). Sans elle, boutons en panneau bois/parchemin. */
  background?: string
  /** Classes Tailwind pour le padding horizontal + l'espacement de la grille (fond image) — moins de
   * padding/gap laisse plus de place à chaque icône, qui remplit toujours sa colonne (w-full). */
  gridClassName?: string
}

const HOVER_GROW = 'transition-transform duration-200 ease-out hover:scale-110 active:scale-95'

function PlainButtonGrid({ buttons, gridClassName }: { buttons: DashboardButtonDef[]; gridClassName: string }) {
  return (
    <div className={`grid grid-cols-2 ${gridClassName}`}>
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={b.onClick}
          className={`press-effect flex flex-col items-center gap-2 ${HOVER_GROW}`}
        >
          <img
            src={b.icon}
            alt=""
            draggable={false}
            className="w-full h-auto aspect-square object-contain [image-rendering:pixelated] select-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]"
          />
          <span className="font-pixel text-[10px] leading-tight text-white text-pixel-outline text-center">
            {b.label}
          </span>
          {b.description && (
            <span className="text-[10px] text-neutral-200 drop-shadow text-center">{b.description}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function PanelButtonGrid({ buttons }: { buttons: DashboardButtonDef[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {buttons.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={b.onClick}
          className={`dashboard-panel-button press-effect flex flex-col items-center gap-2 p-4 text-center ${HOVER_GROW}`}
        >
          <img
            src={b.icon}
            alt=""
            draggable={false}
            className="w-12 h-12 object-contain [image-rendering:pixelated] select-none"
          />
          <span className="text-sm font-medium text-[#3A2E1C] [text-shadow:1px_1px_0_rgba(58,46,28,0.25)]">
            {b.label}
          </span>
          {b.description && <span className="text-xs text-[#5c4a33]">{b.description}</span>}
        </button>
      ))}
    </div>
  )
}

export function DashboardScreen({ title, onBack, buttons, background, gridClassName }: DashboardScreenProps) {
  if (background) {
    return (
      <div className="relative isolate min-h-svh flex flex-col overflow-hidden">
        <img
          src={background}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover -z-10 select-none [image-rendering:pixelated]"
        />

        <div className="flex items-center gap-3 px-4 pt-4">
          <button onClick={onBack} className="text-2xl text-white drop-shadow press-effect" aria-label="Retour">
            ←
          </button>
          <h2 className="font-pixel text-xs text-white text-pixel-outline">{title}</h2>
        </div>

        <div className="min-h-[33svh] flex items-center justify-center pt-2 pb-4">
          <PlainButtonGrid buttons={buttons} gridClassName={gridClassName ?? 'gap-6 px-10 w-full'} />
        </div>

        <div className="flex-1" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md px-4 py-4">
      <HeaderWithBack title={title} onBack={onBack} />
      <PanelButtonGrid buttons={buttons} />
    </div>
  )
}
