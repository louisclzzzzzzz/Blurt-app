export type CharacterState = 'idle' | 'listening' | 'processing' | 'confirming'

// Une entrée par état, actuellement des .png — le composant ne connaît que
// "un état -> une source", donc passer une entrée en .webm/.gif plus tard
// (avec un <video>/<img> adapté) ne change pas cette logique.
const DEFAULT_SOURCES: Record<CharacterState, string> = {
  idle: '/images/front/druide1.png',
  listening: '/images/front/druide2.png',
  processing: '/images/front/druide3.png',
  confirming: '/images/front/druide4.png',
}

interface CharacterDisplayProps {
  state: CharacterState
  sources?: Partial<Record<CharacterState, string>>
  className?: string
}

export function CharacterDisplay({ state, sources, className }: CharacterDisplayProps) {
  const src = sources?.[state] ?? DEFAULT_SOURCES[state]

  return (
    <img
      key={state}
      src={src}
      alt={`Druide — ${state}`}
      draggable={false}
      className={`[image-rendering:pixelated] select-none ${className ?? ''}`}
    />
  )
}
