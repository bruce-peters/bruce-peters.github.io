import { useEffect, useState } from 'react'

// Boot lines — machine voice, lowercase, commit-message cadence. `tone` colors
// the text with a design-system phoneme; `tag` is the right-aligned status chip.
const LINES = [
  { prompt: '>', text: 'booting /bp/ runtime',            tone: 'accent', tag: 'ok'   },
  { prompt: '>', text: 'init scene renderer',             tone: 'fg',     tag: 'ok'   },
  { prompt: '>', text: 'load geometry · field robot',     tone: 'fg',     tag: 'ok'   },
  { prompt: '>', text: 'compile shaders',                 tone: 'lime',   tag: 'ok'   },
  { prompt: '>', text: 'stream textures',                 tone: 'fg',     tag: 'ok'   },
  { prompt: '>', text: 'mount ui layer',                  tone: 'coral',  tag: 'ok'   },
]

// Fast + snappy. Typing reads as a burst rather than a slow crawl.
const CHAR_DELAY = 9    // ms per character
const LINE_GAP   = 45   // ms pause between lines

// Deterministic-ish per-line "duration" chips (e.g. 1.8ms) for flavor.
const DURS = LINES.map(() => (0.3 + Math.random() * 3.4).toFixed(1))

const TONE = {
  accent: 'text-accent',
  lime:   'text-lime',
  coral:  'text-coral',
  fg:     'text-fg/80',
}

function useBoot() {
  const [lines, setLines]     = useState([])   // fully revealed lines (indices)
  const [current, setCurrent] = useState(0)    // which line is typing
  const [typed, setTyped]     = useState('')   // chars revealed so far

  useEffect(() => {
    if (current >= LINES.length) return

    const full = LINES[current].text

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
  const frac = current < LINES.length ? typed.length / LINES[current].text.length : 0
  const progress = Math.min(1, (lines.length + frac) / LINES.length)

  return { lines, current, typed, done, progress }
}

function Line({ idx, text }) {
  const l = LINES[idx]
  return (
    <p className="flex items-center gap-2">
      <span className="text-accent/80 select-none">{l.prompt}</span>
      <span className={TONE[l.tone] ?? TONE.fg}>{text}</span>
      <span className="flex-1 border-b border-dashed border-line/60 translate-y-px" />
      <span className="text-dim2 tabular-nums">{DURS[idx]}ms</span>
      <span className="rounded-sm bg-accent/15 px-1 text-accent">{l.tag}</span>
    </p>
  )
}

export default function LoadingScreen({ loaded }) {
  const { lines, current, typed, done, progress } = useBoot()

  // While the boot script runs we show its progress; once the script is done
  // but assets are still streaming, the bar holds near-full and pulses.
  const barPct = loaded ? 100 : Math.round((done ? 0.94 : progress * 0.94) * 100)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg transition-opacity duration-700"
      style={{ opacity: loaded ? 0 : 1, pointerEvents: loaded ? 'none' : 'auto' }}
    >
      {/* terminal window */}
      <div className="relative w-[400px] overflow-hidden rounded-xl border border-line bg-ink-800 font-mono text-[11px] leading-relaxed shadow-2xl">

        {/* title bar */}
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-magenta/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-lime/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
          <span className="ml-2 text-dim2 tracking-widest">boot.sh</span>
          <span className="ml-auto text-dim2 tabular-nums">{barPct}%</span>
        </div>

        {/* output body */}
        <div className="space-y-0.5 px-4 py-3">
          {/* header comment */}
          <p className="text-dim2 mb-2">// /bp/ portfolio — v2.0 — three.js</p>

          {/* completed lines */}
          {lines.map((idx) => (
            <Line key={idx} idx={idx} text={LINES[idx].text} />
          ))}

          {/* currently typing line */}
          {!done && (
            <p className="flex items-center gap-2">
              <span className="text-accent/80 select-none">{LINES[current].prompt}</span>
              <span className={TONE[LINES[current].tone] ?? TONE.fg}>{typed}</span>
              <span className="inline-block h-[12px] w-[6px] translate-y-px bg-accent animate-pulse2" />
            </p>
          )}

          {/* final status line — gates on the real asset load */}
          {done && (
            <p className="mt-1 flex items-center gap-2">
              <span className="text-accent select-none">$</span>
              {loaded ? (
                <span className="text-accent">ready<span className="ml-1">✓</span></span>
              ) : (
                <span className="text-dim flex items-center gap-2">
                  linking assets
                  <span className="flex gap-1">
                    <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.2s]" />
                    <span className="h-1 w-1 rounded-full bg-accent animate-bounce [animation-delay:-0.1s]" />
                    <span className="h-1 w-1 rounded-full bg-accent animate-bounce" />
                  </span>
                </span>
              )}
            </p>
          )}

          {/* progress bar */}
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
              style={{
                width: `${barPct}%`,
                boxShadow: '0 0 8px rgba(87,211,106,0.7)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
