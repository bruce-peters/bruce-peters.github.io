import { useEffect, useState } from 'react'

const LINES = [
  { prompt: '>', text: 'init scene renderer' },
  { prompt: '>', text: 'load geometry assets' },
  { prompt: '>', text: 'compile shaders' },
  { prompt: '>', text: 'mount ui layer' },
  { prompt: '$', text: 'ready' },
]

const CHAR_DELAY = 28   // ms per character
const LINE_GAP   = 120  // ms pause between lines

function useBoot() {
  const [lines, setLines]   = useState([])   // fully revealed lines
  const [current, setCurrent] = useState(0)  // which line is typing
  const [typed, setTyped]   = useState('')   // chars revealed so far

  useEffect(() => {
    if (current >= LINES.length) return

    const full = LINES[current].text

    if (typed.length < full.length) {
      const t = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), CHAR_DELAY)
      return () => clearTimeout(t)
    }

    // line complete — push to revealed list after a short pause
    const t = setTimeout(() => {
      setLines(prev => [...prev, { ...LINES[current], text: full }])
      setCurrent(c => c + 1)
      setTyped('')
    }, LINE_GAP)
    return () => clearTimeout(t)
  }, [current, typed])

  const activePrompt = current < LINES.length ? LINES[current].prompt : null

  return { lines, activePrompt, typed, done: current >= LINES.length }
}

export default function LoadingScreen({ loaded }) {
  const { lines, activePrompt, typed, done } = useBoot()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg transition-opacity duration-700"
      style={{ opacity: loaded ? 0 : 1, pointerEvents: loaded ? 'none' : 'auto' }}
    >
      {/* terminal window */}
      <div className="w-[340px] rounded border border-line bg-ink-800 font-mono text-[11px] leading-relaxed shadow-2xl">

        {/* title bar */}
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-500" />
          <span className="ml-2 text-dim2 tracking-widest">boot.sh</span>
        </div>

        {/* output body */}
        <div className="space-y-0.5 px-4 py-3">
          {/* header comment */}
          <p className="text-dim2 mb-2">// /bp/ portfolio — v2.0</p>

          {/* completed lines */}
          {lines.map((l, i) => (
            <p key={i} className="flex gap-2">
              <span className="text-dim2 select-none">{l.prompt}</span>
              <span className={l.prompt === '$' ? 'text-accent' : 'text-fg/70'}>{l.text}</span>
              {l.prompt === '$' && (
                <span className="text-accent ml-1">✓</span>
              )}
            </p>
          ))}

          {/* currently typing line */}
          {activePrompt && (
            <p className="flex gap-2">
              <span className="text-dim2 select-none">{activePrompt}</span>
              <span className="text-fg/70">{typed}</span>
              <span className="inline-block w-[6px] h-[12px] bg-accent animate-pulse2 translate-y-px" />
            </p>
          )}

          {/* idle cursor after done */}
          {done && (
            <p className="flex gap-2 mt-1">
              <span className="text-dim2 select-none">$</span>
              <span className="inline-block w-[6px] h-[12px] bg-accent animate-pulse2 translate-y-px" />
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
