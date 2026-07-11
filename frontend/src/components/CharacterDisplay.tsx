export type CharacterState = 'idle' | 'listening' | 'processing' | 'confirming'

// Une entrée par état — boucle vidéo silencieuse (10s, 1080x1920).
const DEFAULT_SOURCES: Record<CharacterState, string> = {
  idle: '/images/front/anim-idle.mp4',
  listening: '/images/front/anim-listening.mp4',
  processing: '/images/front/anim-processing.mp4',
  confirming: '/images/front/anim-confirming.mp4',
}

interface CharacterDisplayProps {
  state: CharacterState
  sources?: Partial<Record<CharacterState, string>>
  className?: string
}

export function CharacterDisplay({ state, sources, className }: CharacterDisplayProps) {
  const src = sources?.[state] ?? DEFAULT_SOURCES[state]

  return (
    <video
      key={state}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      aria-label={`Druide — ${state}`}
      className={`object-cover select-none ${className ?? ''}`}
    />
  )
}
