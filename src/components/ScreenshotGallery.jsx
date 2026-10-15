import { useRef, useState } from 'react'

const EASE = 'cubic-bezier(0.22,1,0.36,1)'
const SWIPE_PX = 40 // horizontal travel that commits a swipe

// Archive-card banner for works with several screenshots. Same 160px
// object-cover strip as the single-image banner, but the slides sit on a track
// that pages by arrow pills, dots, a horizontal swipe, or ←/→ while focused.
export default function ScreenshotGallery({ images, title }) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  // Clipped slides never intersect the viewport, so lazy loading would hold
  // them back until shown. Once the first slide loads, fetch the rest.
  const [primed, setPrimed] = useState(false)
  const start = useRef(null)
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const count = images.length
  const go = i => setIndex((i + count) % count)

  const onPointerDown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = e => {
    if (!start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (!dragging) {
      // Only claim the gesture once it's clearly horizontal; vertical drags
      // stay with the page (touch-action: pan-y hands those to the browser).
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return
      setDragging(true)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    // Rubber-band past the first and last slide instead of wrapping.
    const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0)
    setDrag(atEdge ? dx * 0.3 : dx)
  }
  const onPointerEnd = () => {
    if (dragging) {
      if (drag <= -SWIPE_PX && index < count - 1) setIndex(index + 1)
      else if (drag >= SWIPE_PX && index > 0) setIndex(index - 1)
    }
    start.current = null
    setDragging(false)
    setDrag(0)
  }

  const onKeyDown = e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1) }
  }

  // Arrow pills fade in on hover where there is hover; always shown on touch.
  const arrow =
    'absolute top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-bg/75 backdrop-blur-sm border border-line text-cream font-mono text-[13px] leading-none p-0 cursor-pointer transition-[opacity,border-color,color] duration-[140ms] hover:border-accent hover:text-accent [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent'

  return (
    <div
      className="group relative -mx-7 -mt-6 mb-4 overflow-hidden border-b border-line"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} screenshots`}
      onKeyDown={onKeyDown}
    >
      <div
        className="flex h-40 select-none cursor-grab active:cursor-grabbing"
        style={{
          transform: `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)`,
          transition: dragging || reduce ? 'none' : `transform 240ms ${EASE}`,
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {images.map((img, i) => (
          <img
            key={img.src}
            src={img.src}
            alt={img.alt || `${title} screenshot ${i + 1}`}
            aria-hidden={i !== index}
            loading={i > 0 && primed ? 'eager' : 'lazy'}
            draggable={false}
            onLoad={i === 0 ? () => setPrimed(true) : undefined}
            className="block w-full h-40 shrink-0 object-cover"
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous screenshot"
        onClick={() => go(index - 1)}
        className={`${arrow} left-3`}
      >
        ←
      </button>
      <button
        type="button"
        aria-label="Next screenshot"
        onClick={() => go(index + 1)}
        className={`${arrow} right-3`}
      >
        →
      </button>

      {/* Position readout — dots plus a mono counter in one pill */}
      <div className="absolute bottom-2.5 right-3 inline-flex items-center gap-2 rounded-full bg-bg/75 backdrop-blur-sm border border-line pl-1.5 pr-2.5 py-0.5">
        <div className="flex items-center">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              aria-label={`Show screenshot ${i + 1} of ${count}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className="group/dot p-1 bg-transparent border-0 cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent rounded-full"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-[240ms] ${
                  i === index ? 'w-4 bg-accent' : 'w-1.5 bg-dim2 group-hover/dot:bg-dim'
                }`}
              />
            </button>
          ))}
        </div>
        <span className="font-mono text-[10px] tracking-[0.18em] text-dim" aria-live="polite">
          {String(index + 1).padStart(2, '0')}/{String(count).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
