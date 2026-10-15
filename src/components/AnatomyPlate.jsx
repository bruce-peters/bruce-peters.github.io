import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FIGURES } from '../anatomy/index.js'
import '../anatomy/anatomy.css'

// An anatomy figure as the banner at the top of a project card, in the slot
// the archive cards use for their screenshot. The figure's code loads when the
// card comes within a screen of the viewport; until then the banner holds its
// height so the card doesn't jump. "expand" opens the same machine large.
export default function AnatomyPlate({ id, heading }) {
  const spec = FIGURES[id]
  const ref = useRef(null)
  const readout = useRef(null)
  const [near, setNear] = useState(false)
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[entries.length - 1].isIntersecting) {
          setNear(true)
          obs.disconnect()
        }
      },
      { rootMargin: '100% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [near])

  if (!spec) return null
  const { Figure } = spec
  const placeholder = <div className="bp-anatomy-hold" style={{ aspectRatio: `1 / ${spec.ratio}` }} />

  return (
    <div ref={ref} className="bp-anatomy bp-anatomy-banner iso" data-theme="dark">
      <div className="bp-anatomy-labels" aria-hidden="true">
        <span data-corner="title">{spec.title}</span>
        <span data-corner="hint">{spec.hint}</span>
        <span data-corner="readout" ref={readout}>{spec.rest}</span>
      </div>
      <button type="button" className="bp-anatomy-expand" onClick={() => setOpen(true)} aria-label={`Expand the ${spec.title} figure`}>
        expand <span aria-hidden="true">⤢</span>
      </button>
      {near ? (
        <Suspense fallback={placeholder}>
          <Figure readout={readout} />
        </Suspense>
      ) : (
        placeholder
      )}
      {open && <AnatomyModal spec={spec} heading={heading} onClose={close} />}
    </div>
  )
}

// The same machine, as large as the window allows. Portaled to <body> so the
// card's entrance transform can't trap the fixed overlay, like DesmosModal.
function AnatomyModal({ spec, heading, onClose }) {
  const closeRef = useRef(null)
  const readout = useRef(null)
  const { Figure } = spec

  useEffect(() => {
    const prevFocus = document.activeElement
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 md:p-10"
      style={{ background: 'rgba(10,10,12,0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${heading ?? spec.title}: ${spec.title}`}
    >
      <div className="relative w-full max-w-[1360px] h-[min(90vh,880px)] flex flex-col border border-line rounded-[14px] bg-ink-800 overflow-hidden shadow-2xl">
        <span className="absolute top-0 left-0 right-0 h-[3px] z-10" style={{ background: '#57d36a', boxShadow: '0 0 16px rgba(87,211,106,0.5)' }} />

        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-line">
          <div className="min-w-0 flex items-baseline gap-3">
            {heading && (
              <span className="font-display font-bold text-[18px] md:text-[20px] leading-none tracking-[-0.02em] text-fg whitespace-nowrap">
                {heading}
              </span>
            )}
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-dim2 truncate">{spec.title}</span>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase text-dim bg-transparent border border-line rounded-full px-3 py-1.5 cursor-pointer transition-colors duration-200 hover:text-fg hover:border-dim2"
          >
            <span className="hidden sm:inline">esc</span> ✕
          </button>
        </div>

        <div className="bp-anatomy bp-anatomy-modal iso relative flex-1 min-h-0" data-theme="dark">
          <Suspense fallback={null}>
            <Figure readout={readout} />
          </Suspense>
        </div>

        <div className="flex items-center justify-between gap-4 px-4 md:px-5 py-3 border-t border-line font-mono text-[11px]">
          <span className="tracking-[0.14em] uppercase text-dim2 hidden sm:inline">{spec.hint}</span>
          <span ref={readout} className="text-dim tabular-nums ml-auto">{spec.rest}</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
