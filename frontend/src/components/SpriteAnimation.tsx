import { useEffect, useRef } from 'react'

interface SpriteAnimationProps {
  src: string
  frameCount: number
  frameWidth: number
  frameHeight: number
  /** Images par seconde de la boucle. Par défaut ~1.2, le rythme réel de la vidéo source. */
  fps?: number
  className?: string
  alt?: string
}

// Joue une feuille de sprites (frames alignées horizontalement) sur un
// <canvas>, en reproduisant le comportement "object-cover" d'un <img> — le
// CSS background-size ne peut pas à la fois cadrer une frame unique et
// faire du cover sur un conteneur de taille arbitraire, d'où le canvas.
export function SpriteAnimation({
  src,
  frameCount,
  frameWidth,
  frameHeight,
  fps = 1.2,
  className,
  alt,
}: SpriteAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameIndex = 0
    let rafId = 0
    let intervalId = 0
    let cancelled = false

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.clientWidth
      const cssHeight = canvas.clientHeight
      const pixelWidth = Math.round(cssWidth * dpr)
      const pixelHeight = Math.round(cssHeight * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      if (pixelWidth === 0 || pixelHeight === 0) return

      const scale = Math.max(pixelWidth / frameWidth, pixelHeight / frameHeight)
      const drawWidth = frameWidth * scale
      const drawHeight = frameHeight * scale
      const dx = (pixelWidth - drawWidth) / 2
      const dy = (pixelHeight - drawHeight) / 2

      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, pixelWidth, pixelHeight)
      ctx.drawImage(
        img,
        frameIndex * frameWidth,
        0,
        frameWidth,
        frameHeight,
        dx,
        dy,
        drawWidth,
        drawHeight,
      )
    }

    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      draw()
      intervalId = window.setInterval(() => {
        frameIndex = (frameIndex + 1) % frameCount
        draw()
      }, 1000 / fps)
    }
    img.src = src

    const resizeObserver = new ResizeObserver(() => {
      rafId = requestAnimationFrame(draw)
    })
    resizeObserver.observe(canvas)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [src, frameCount, frameWidth, frameHeight, fps])

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={alt}
      className={className}
    />
  )
}
