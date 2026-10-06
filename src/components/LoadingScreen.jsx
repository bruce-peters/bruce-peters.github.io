import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Boot lines — machine voice, lowercase, commit-message cadence.
const LINES = [
  'booting /bp/ runtime',
  'init webgl renderer',
  'loading field geometry',
  'placing robot',
  'wiring swerve modules',
  'calibrating camera path',
  'streaming project screenshots',
  'compiling shaders',
  'spawning game pieces',
  'linking dom cards',
  'warming up physics',
  'mounting ui',
]
const MAX_LEN = Math.max(...LINES.map(l => l.length))

const REDUCE =
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const CHAR_MS  = 12                  // per typed character
const GAP_MS   = 60                  // pause after a line finishes
const SHIFT_MS = REDUCE ? 0 : 150    // history slides up one row
const LINE_H   = 24                  // px per log row

// Older rows trail up behind the current one and fade with distance.
const TRAIL = [1, 0.45, 0.22, 0.1, 0]

// The whole boot is laid out up front. Row i becomes the head at `head[i]`
// (the slide starts), starts typing at `type[i]`. Row N is the `$` status row.
const head = [0]
const type = [0]
LINES.forEach((l, i) => {
  const end = type[i] + l.length * CHAR_MS
  head.push(end + GAP_MS)
  type.push(end + GAP_MS + SHIFT_MS)
})
const BOOT_MS = head[LINES.length] + SHIFT_MS

// If the scene finishes loading early, the rest of the boot speeds up so it
// wraps in about this long instead of making people wait on flavor text.
// Capped so the typing never turns into a blur.
const CATCH_UP_MS  = 700
const MAX_CATCH_UP = 5

// Outro: a beat on "ready", clear the text, then open the pill window.
const READY_HOLD   = 250
const TEXT_OUT     = 180
const TINT_MS      = 120
const OPEN_MS      = 900
const OPEN_EASE    = 'cubic-bezier(0.76, 0, 0.24, 1)'

const ACCENT = '#57d36a'   // tailwind `accent` — needed raw for the cap gradients

function Caret() {
  return <span className="inline-block h-[13px] w-[7px] translate-y-[2px] bg-accent motion-safe:animate-caret" />
}

// Everything in the boot animates transform/opacity through the Web Animations
// API, scheduled once at mount. Those run on the compositor, so the typing
// stays smooth while the 3D scene is being built on the main thread.
function useBootTimeline({ stack, rows, covers, carets, bar }, onDone) {
  const animsRef = useRef([])

  useLayoutEffect(() => {
    const at = ms => ms / BOOT_MS
    const anims = []

    // Stack: slide up one row each time a new head arrives.
    const stackKf = [{ offset: 0, transform: 'translateY(0)' }]
    for (let i = 1; i <= LINES.length; i++) {
      stackKf.push({ offset: at(head[i]), transform: `translateY(${-(i - 1) * LINE_H}px)`, easing: 'ease-out' })
      stackKf.push({ offset: at(head[i] + SHIFT_MS), transform: `translateY(${-i * LINE_H}px)` })
    }
    anims.push(stack.current.animate(stackKf, { duration: BOOT_MS, fill: 'forwards' }))

    // Rows: fade in as they become the head, then step down the trail.
    rows.current.forEach((row, i) => {
      if (!row) return
      const kf = [{ offset: 0, opacity: i === 0 ? 1 : 0 }]
      for (let k = 0; k < TRAIL.length && i + k <= LINES.length; k++) {
        const t = head[i + k]
        if (i === 0 && k === 0) continue
        kf.push({ offset: at(t), opacity: k === 0 ? 0 : TRAIL[k - 1] })
        kf.push({ offset: at(t + SHIFT_MS), opacity: TRAIL[k] })
      }
      kf.push({ offset: 1, opacity: kf[kf.length - 1].opacity })
      anims.push(row.animate(kf, { duration: BOOT_MS, fill: 'forwards' }))
    })

    // Typing: a bg-colored cover (caret on its leading edge) steps right one
    // character at a time, uncovering the text.
    covers.current.forEach((cover, i) => {
      if (!cover) return
      const n = LINES[i].length
      anims.push(cover.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(${n}ch)` }],
        { duration: n * CHAR_MS, delay: type[i], easing: `steps(${n}, end)`, fill: 'both' },
      ))
    })

    // Caret only shows on the head row.
    carets.current.forEach((caret, i) => {
      if (!caret || i === LINES.length) return
      anims.push(caret.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 1, delay: head[i + 1], fill: 'forwards' },
      ))
    })

    anims.push(bar.current.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: BOOT_MS, easing: 'linear', fill: 'forwards' },
    ))

    // The stack spans the whole boot, so its end is the boot's end, and it
    // tracks any speed-up applied below.
    anims[0].finished.then(onDone, () => {})

    animsRef.current = anims
    return () => anims.forEach(a => a.cancel())
  }, [stack, rows, covers, carets, bar, onDone])

  // Speed whatever is left of the boot up so it wraps in ~CATCH_UP_MS.
  return useRef(() => {
    const anims = animsRef.current
    const left = BOOT_MS - (anims[0]?.currentTime ?? BOOT_MS)
    const rate = Math.min(MAX_CATCH_UP, Math.max(1, left / CATCH_UP_MS))
    if (rate > 1) anims.forEach(a => a.updatePlaybackRate(rate))
  }).current
}

// The outro: solid green everywhere except a pill-shaped hole that grows from
// the center until it clears the screen. The green is built from six pieces
// that only ever translate or scale, so the whole thing runs on the compositor
// and can't be stalled by the scene's work on the main thread:
//   - four bands (top, bottom, left, right) slide outward
//   - two end caps (a half-disc bite out of a box) scale up and slide out
// Every piece's transform is linear in the hole's size, and they share one
// easing curve, so they stay aligned on every frame. Pieces overlap by 1px so
// no seams show.
function PillWindow({ cover, onDone }) {
  const container = useRef(null)
  const top = useRef(null)
  const bottom = useRef(null)
  const left = useRef(null)
  const right = useRef(null)
  const capL = useRef(null)
  const capR = useRef(null)

  // Final hole: a stadium just big enough that its edge clears every corner.
  const [geo] = useState(() => {
    const W = window.innerWidth
    const H = window.innerHeight
    const r = (H * 1.15) / 2                  // cap radius
    const a = ((W + H) * 1.08) / 2 - r        // cap center offset from middle
    return { r, a }
  })
  const { r, a } = geo

  useLayoutEffect(() => {
    const opts = { duration: OPEN_MS, delay: TINT_MS, easing: OPEN_EASE, fill: 'both' }
    const move = (el, from, to) => el.current.animate([{ transform: from }, { transform: to }], opts)
    const anims = [
      // green fades in over the dark cover, then the cover drops out under it
      container.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TINT_MS, fill: 'both' }),
      cover.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: TINT_MS, fill: 'forwards' }),
      move(top,    'translateY(1px)',  `translateY(${1 - r}px)`),
      move(bottom, 'translateY(-1px)', `translateY(${r - 1}px)`),
      move(left,   'translateX(1px)',  `translateX(${1 - a - r}px)`),
      move(right,  'translateX(-1px)', `translateX(${a + r - 1}px)`),
      move(capL,   'translateX(0px) scale(0)', `translateX(${-a}px) scale(1)`),
      move(capR,   'translateX(0px) scale(0)', `translateX(${a}px) scale(1)`),
    ]
    anims[anims.length - 1].finished.then(onDone, () => {})
    return () => anims.forEach(x => x.cancel())
  }, [cover, onDone, r, a])

  const band = 'absolute bg-accent will-change-transform'
  const cap = {
    position: 'absolute',
    top: `calc(50% - ${r}px)`,
    width: r,
    height: 2 * r,
    transform: 'scale(0)',
  }

  return (
    <div ref={container} className="absolute inset-0" style={{ opacity: 0 }}>
      <div ref={top}    className={`${band} inset-x-0 top-0 h-1/2`} />
      <div ref={bottom} className={`${band} inset-x-0 bottom-0 h-1/2`} />
      <div ref={left}   className={`${band} inset-y-0 left-0 w-1/2`} />
      <div ref={right}  className={`${band} inset-y-0 right-0 w-1/2`} />
      <div
        ref={capL}
        className="will-change-transform"
        style={{
          ...cap,
          left: `calc(50% - ${r}px)`,
          transformOrigin: '100% 50%',
          background: `radial-gradient(circle ${r}px at 100% 50%, transparent ${r - 1}px, ${ACCENT} ${r}px)`,
        }}
      />
      <div
        ref={capR}
        className="will-change-transform"
        style={{
          ...cap,
          left: '50%',
          transformOrigin: '0% 50%',
          background: `radial-gradient(circle ${r}px at 0% 50%, transparent ${r - 1}px, ${ACCENT} ${r}px)`,
        }}
      />
    </div>
  )
}

export default function LoadingScreen({ loaded }) {
  const [phase, setPhase] = useState('boot')   // boot → out → open → gone
  const [done, setDone] = useState(false)

  const stack = useRef(null)
  const rows = useRef([])
  const covers = useRef([])
  const carets = useRef([])
  const bar = useRef(null)
  const cover = useRef(null)

  const markDone = useRef(() => setDone(true)).current
  const catchUp = useBootTimeline({ stack, rows, covers, carets, bar }, markDone)

  useEffect(() => {
    if (loaded) catchUp()
  }, [loaded, catchUp])

  // Once the script has finished and the scene is ready, run the outro.
  useEffect(() => {
    if (!done || !loaded) return
    const timers = [
      setTimeout(() => setPhase('out'), READY_HOLD),
      setTimeout(() => setPhase(REDUCE ? 'gone' : 'open'), READY_HOLD + TEXT_OUT),
    ]
    return () => timers.forEach(clearTimeout)
  }, [done, loaded])

  const finish = useRef(() => setPhase('gone')).current

  if (phase === 'gone') return null

  const open = phase === 'open'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ pointerEvents: open ? 'none' : 'auto' }}
    >
      {/* plain cover during boot; the green pill window takes over for the outro */}
      <div ref={cover} className="absolute inset-0 bg-bg" />
      {open && <PillWindow cover={cover} onDone={finish} />}

      {!open && (
        <div
          className="relative max-w-[calc(100vw-32px)] font-mono text-[13px] text-fg transition-opacity duration-[220ms]"
          style={{ width: `${MAX_LEN + 4}ch`, opacity: phase === 'boot' ? 1 : 0 }}
        >
          {/* the slot — the head row sits here, history stacks above it */}
          <div className="relative" style={{ height: LINE_H }}>
            <div ref={stack} className="absolute inset-x-0 top-0 will-change-transform">
              {[...LINES, null].map((text, i) => (
                <p
                  key={i}
                  ref={el => { rows.current[i] = el }}
                  className="absolute inset-x-0 m-0 whitespace-nowrap"
                  style={{ top: i * LINE_H, lineHeight: `${LINE_H}px`, opacity: i === 0 ? 1 : 0 }}
                >
                  <span className="mr-2 select-none text-accent">{text === null ? '$' : '>'}</span>
                  {text === null ? (
                    loaded && done ? <span className="text-accent">ready</span> : <Caret />
                  ) : (
                    <span className="relative inline-block overflow-hidden align-top" style={{ width: `${text.length + 1.2}ch` }}>
                      {text}
                      <span
                        ref={el => { covers.current[i] = el }}
                        className="absolute inset-y-0 left-0 flex"
                        style={{ width: `${text.length + 2}ch` }}
                      >
                        <span ref={el => { carets.current[i] = el }} className="w-[1ch] shrink-0 bg-bg">
                          <Caret />
                        </span>
                        <span className="flex-1 bg-bg" />
                      </span>
                    </span>
                  )}
                </p>
              ))}
            </div>
          </div>

          <div className="mt-4 h-px w-full overflow-hidden bg-line">
            <div ref={bar} className="h-full w-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
