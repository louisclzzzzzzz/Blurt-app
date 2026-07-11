import type { CSSProperties } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

interface CoverRect {
  offsetX: number
  offsetY: number
  displayedWidth: number
  displayedHeight: number
}

/**
 * Ancre des éléments sur une image de fond en `object-fit: cover`, quel que soit le
 * format d'écran : calcule le rectangle réellement affiché de l'image (recadrage inclus)
 * pour convertir des coordonnées en % *de l'image d'origine* en position CSS absolue.
 */
export function useCoverAnchor(imageWidth: number, imageHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<CoverRect>({
    offsetX: 0,
    offsetY: 0,
    displayedWidth: imageWidth,
    displayedHeight: imageHeight,
  })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const recompute = () => {
      const { width: containerWidth, height: containerHeight } = el.getBoundingClientRect()
      const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight)
      const displayedWidth = imageWidth * scale
      const displayedHeight = imageHeight * scale
      setRect({
        offsetX: (containerWidth - displayedWidth) / 2,
        offsetY: (containerHeight - displayedHeight) / 2,
        displayedWidth,
        displayedHeight,
      })
    }

    recompute()
    const observer = new ResizeObserver(recompute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [imageWidth, imageHeight])

  const anchorStyle = (xPercent: number, yPercent: number): CSSProperties => ({
    position: 'absolute',
    left: rect.offsetX + (xPercent / 100) * rect.displayedWidth,
    top: rect.offsetY + (yPercent / 100) * rect.displayedHeight,
    transform: 'translate(-50%, -50%)',
  })

  // Échelle de l'image affichée par rapport à sa taille d'origine — pour dimensionner
  // un élément ancré proportionnellement à l'image plutôt qu'au viewport.
  const scale = rect.displayedWidth / imageWidth

  return { containerRef, anchorStyle, scale }
}
