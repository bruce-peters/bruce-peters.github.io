import { useEffect, useState } from 'react'

// Boot lines — machine voice, lowercase, commit-message cadence.
const LINES = [
  'booting /bp/ runtime',
  'loading field + robot',
  'compiling shaders',
  'mounting ui',
]

// Fast + snappy. Typing reads as a burst rather than a slow crawl.
const CHAR_DELAY = 9    // ms per character
const LINE_GAP   = 45   // ms pause between lines

function useBoot() {
  const [lines, setLines]     = useState([])   // fully revealed lines (indices)
  const [current, setCurrent] = useState(0)    // which line is typing
  const [typed, setTyped]     = useState('')   // chars revealed so far

  useEffect(() => {
    if (current >= LINES.length) return

    const full = LINES[current]

    if (typed.length < full.length) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), CHAR_DELAY)
      return () => clearTimeout(t)
    }

    // line complete — push to revealed list after a short pause
    const t = setTimeout(() => {
      setLines(prev => [...prev, current])
      setCurrent(c => c + 1)
      setTyped('')
    }, LINE_GAP)
    return () => clearTimeout(t)
  }, [current, typed])

  const done = current >= LINES.length
  // Progress across the whole boot, including the fraction of the active line.
  const frac = current < LINES.length ? typed.length / LINES[current].length : 0
  const progress = Math.min(1, (lines.length + frac) / LINES.length)

  return { lines, current, typed, done, progress }
}

function Caret() {
  return <span className="ml-0.5 inline-block h-[13px] w-[7px] translate-y-[2px] bg-accent motion-safe:animate-caret" />
}

export default function LoadingScreen({ loaded }) {
  const { lines, typed, done, progress } = useBoot()

  // While the boot script runs we show its progress; once the script is done
  // but assets are still streaming, the bar holds near-full.
  const barPct = loaded ? 100 : Math.round((done ? 0.94 : progress * 0.94) * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg transition-opacity duration-700"
      style={{ opacity: loaded ? 0 : 1, pointerEvents: loaded ? 'none' : 'auto' }}
    >
      <div className="w-[280px] max-w-[calc(100vw-32px)] font-mono text-[12px] leading-[1.9]">
        {/* reserve the full height up front so the block doesn't creep upward as lines land */}
        <div style={{ minHeight: `${(LINES.length + 1) * 1.9}em` }}>
          {lines.map((idx) => (
            <p key={idx} className="m-0 text-dim2">
              <span className="mr-2 select-none text-accent/50">&gt;</span>{LINES[idx]}
            </p>
          ))}

          {!done && (
            <p className="m-0 text-fg/90">
              <span className="mr-2 select-none text-accent">&gt;</span>{typed}<Caret />
            </p>
          )}

          {/* final status line — gates on the real asset load */}
          {done && (
            <p className="m-0 text-accent">
              <span className="mr-2 select-none">$</span>{loaded ? 'ready' : <Caret />}
            </p>
          )}
        </div>

        <div className="mt-4 h-px w-full bg-line">
          <div
            className="h-full bg-accent transition-[width] duration-200 ease-out"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
