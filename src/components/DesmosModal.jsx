import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Live Desmos graph in a terminal-style window. Portaled to <body> so no
// transformed ancestor (card entrance animations) can trap the fixed overlay.
// The iframe only exists while the modal is open, so the page never pays for
// an embed nobody asked for.
export default function DesmosModal({ graph, onClose }) {
  const closeRef = useRef(null)
  // Keyed by graph id so switching graphs shows the loader again without
  // resetting state from inside the effect.
  const [loadedId, setLoadedId] = useState(null)

  useEffect(() => {
    if (!graph) return
    const prevFocus = document.activeElement
    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = prevOverflow
      prevFocus?.focus?.()
    }
  }, [graph, onClose])

  if (!graph) return null
  const loaded = loadedId === graph.id

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 md:p-10"
      style={{ background: 'rgba(10,10,12,0.78)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label={`${graph.title} (live Desmos graph)`}
    >
      <div className="relative w-full max-w-[1360px] h-[min(90vh,880px)] flex flex-col border border-line rounded-[14px] bg-ink-800 overflow-hidden shadow-2xl">
        <span
          className="absolute top-0 left-0 right-0 h-[3px] z-10"
          style={{ background: '#57d36a', boxShadow: '0 0 16px rgba(87,211,106,0.5)' }}
        />

        {/* Title bar */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-line">
          <div className="min-w-0 flex items-baseline gap-3">
            <span className="font-display font-bold text-[18px] md:text-[20px] leading-none tracking-[-0.02em] text-fg whitespace-nowrap">
              {graph.title}
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-dim2 truncate hidden sm:inline">
              {graph.tag}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={graph.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono font-bold text-[12px] tracking-[0.02em] text-cream border border-line rounded-full px-4 py-1.5 no-underline transition-all duration-200 hover:border-accent hover:text-accent"
            >
              open in desmos ↗
            </a>
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase text-dim bg-transparent border border-line rounded-full px-3 py-1.5 cursor-pointer transition-colors duration-200 hover:text-fg hover:border-dim2"
            >
              <span className="hidden sm:inline">esc</span> ✕
            </button>
          </div>
        </div>

        {/* Live graph */}
        <div className="relative flex-1 bg-white">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-900">
              <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-dim">
                loading graph<span className="animate-caret">_</span>
              </span>
            </div>
          )}
          <iframe
            key={graph.id}
            src={graph.href}
            title={`${graph.title} on Desmos`}
            className="absolute inset-0 w-full h-full border-0"
            allow="fullscreen"
            onLoad={() => setLoadedId(graph.id)}
          />
        </div>

        {/* Blurb */}
        <p className="m-0 px-4 md:px-5 py-3 border-t border-line text-[13px] leading-[1.55] text-cream-dim">
          {graph.blurb}
        </p>
      </div>
    </div>,
    document.body
  )
}
