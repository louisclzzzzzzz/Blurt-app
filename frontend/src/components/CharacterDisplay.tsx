import { SpriteAnimation } from './SpriteAnimation'

export type CharacterState = 'idle' | 'listening' | 'processing' | 'confirming'

interface SpriteSheet {
  src: string
  frameCount: number
  frameWidth: number
  frameHeight: number
  fps?: number
}

// Une entrée par état : chaque feuille de sprites vient d'un segment de
// 10s de la vidéo source (24fps, 1 frame gardée toutes les 20), rejouée à
// son rythme d'origine (~1.2fps) pour un effet "portrait vivant" discret.
const DEFAULT_SOURCES: Record<CharacterState, SpriteSheet> = {
  idle: {
    src: '/images/front/anim-idle.png',
    frameCount: 12,
    frameWidth: 219,
    frameHeight: 260,
  },
  listening: {
    src: '/images/front/anim-listening.png',
    frameCount: 12,
    frameWidth: 242,
    frameHeight: 260,
  },
  processing: {
    src: '/images/front/anim-processing.png',
    frameCount: 12,
    frameWidth: 260,
    frameHeight: 260,
  },
  confirming: {
    src: '/images/front/anim-confirming.png',
    frameCount: 12,
    frameWidth: 243,
    frameHeight: 260,
  },
}

interface CharacterDisplayProps {
  state: CharacterState
  sources?: Partial<Record<CharacterState, SpriteSheet>>
  className?: string
}

export function CharacterDisplay({ state, sources, className }: CharacterDisplayProps) {
  const sheet = sources?.[state] ?? DEFAULT_SOURCES[state]

  return (
    <SpriteAnimation
      key={state}
      src={sheet.src}
      frameCount={sheet.frameCount}
      frameWidth={sheet.frameWidth}
      frameHeight={sheet.frameHeight}
      fps={sheet.fps}
      alt={`Druide — ${state}`}
      className={`select-none ${className ?? ''}`}
    />
  )
}
