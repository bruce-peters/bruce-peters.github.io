import { useEffect, useRef } from 'react'
import { sideMatrix, iso, cameraOf } from '../kit/iso-kit.mjs'
import { SEGMENTS, VIEW, LABEL } from './art.generated.js'
import { P, BELT, LINES, FEEDER, STATIONS, GAUGE_X, GAUGES, GAUGE_R, SWITCH, tokenSvg, needleAngle, needlePath, gaugeFace, switchAngle, switchPointer } from './scene.js'
import { CONTEXTS, MODELS } from './model.js'
import { fillStatics, startLoop, toViewBox, prefersStill, setOn, follow } from '../live.js'

// The same clip goes down both lines at the same pace; what differs is how
// much machinery it passes under. Speeds are a figure choice, not timings.
const SPEED = 24 // units per second along the belt
const EVERY = 1.25 // seconds between clips
const TOUR_EVERY = 3.4 // seconds per lesson context while idle
const LINE_MODEL = { back: 0, front: 1 } // MODELS index read by each line's gauge
const fmt = (v) => v.toFixed(3).replace(/^0/, '')

export default function OffTaskFigure({ readout }) {
  const stage = useRef(null)
  const statics = useRef([])
  const slot = {
    tokens_back: useRef(null),
    tokens_front: useRef(null),
    needle_back: useRef(null),
    needle_front: useRef(null),
    pointer: useRef(null),
  }

  useEffect(() => {
    const root = stage.current
    const svg = root.querySelector('svg')
    fillStatics(statics.current, SEGMENTS)
    const still = prefersStill()
    const start = FEEDER.x + FEEDER.w

    const lamps = {}
    for (const line of ['back', 'front']) for (const s of STATIONS[line]) lamps[`${line}.${s.key}`] = svg.querySelector(`.an-lens[data-station="${line}.${s.key}"]`)

    const needles = {}
    for (const line of ['back', 'front']) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('transform', sideMatrix([GAUGE_X, gaugeFace(line) + 0.05], GAUGES[line].z, P, 'left'))
      g.innerHTML = `<path class="iso-line" data-tone="${line === 'back' ? 'lit' : 'hi'}" data-free="start" style="stroke-width:1.1"/><circle r="1" class="an-hub"/>`
      slot[`needle_${line}`].current.appendChild(g)
      needles[line] = { path: g.querySelector('path'), angle: needleAngle(0.5), rate: 0 }
    }

    // Clips already spread along the belts, so the figure starts in motion.
    const clips = still ? [] : Array.from({ length: 7 }, (_, i) => start + i * SPEED * EVERY).filter((x) => x < BELT.to)
    const st = { context: 0, hover: null, tour: !still, tourClock: 0, sinceClip: 0, switch: switchAngle(0), clips }
    let idle = 0

    function step(dt) {
      if (st.tour) {
        st.tourClock += dt
        if (st.tourClock >= TOUR_EVERY) {
          st.context = (st.context + 1) % CONTEXTS.length
          st.tourClock = 0
        }
      }
      if (!still) {
        st.sinceClip += dt
        if (st.sinceClip >= EVERY) {
          st.clips.push(start)
          st.sinceClip = 0
        }
        st.clips = st.clips.map((x) => x + SPEED * dt).filter((x) => x < BELT.to + 2)
      }
      for (const line of ['back', 'front']) {
        const n = needles[line]
        const target = needleAngle(MODELS[LINE_MODEL[line]].scores[st.context])
        if (still) {
          n.angle = target
          n.rate = 0
          continue
        }
        for (let j = 0; j < 4; j++) {
          const h = dt / 4
          n.rate += ((target - n.angle) * 90 - n.rate * 15) * h
          n.angle += n.rate * h
        }
      }
      st.switch = follow(st.switch, switchAngle(st.context), dt, 0.12, still)
      return true
    }

    function draw() {
      for (const line of ['back', 'front']) {
        slot[`tokens_${line}`].current.innerHTML = st.clips.map((x) => tokenSvg(x, LINES[line])).join('')
        for (const s of STATIONS[line]) setOn(lamps[`${line}.${s.key}`], st.clips.some((x) => Math.abs(x - s.x) < s.w / 2))
        needles[line].path.setAttribute('d', needlePath(needles[line].angle))
      }
      slot.pointer.current.innerHTML = switchPointer(st.switch)
      const c = CONTEXTS[st.context]
      const text = st.hover
        ? `${st.hover === 'back' ? 'image model + head' : '96 hand-built features'} · ${fmt(MODELS[LINE_MODEL[st.hover]].scores[st.context])}`
        : `${c.name} · ${fmt(MODELS[0].scores[st.context])} vs ${fmt(MODELS[1].scores[st.context])}`
      if (readout.current && readout.current.textContent !== text) readout.current.textContent = text
    }

    const loop = startLoop(root, { step, draw })

    const takeOver = () => {
      st.tour = false
      clearTimeout(idle)
      idle = setTimeout(() => {
        st.tour = !still
        st.tourClock = 0
        loop.run()
      }, 6000)
    }
    const pick = (i) => {
      st.context = ((i % CONTEXTS.length) + CONTEXTS.length) % CONTEXTS.length
      takeOver()
      loop.run()
    }
    const scale = cameraOf(P).k
    const gaugeAt = ([px, py]) => {
      for (const line of ['back', 'front']) {
        const [cx, cy] = iso([GAUGE_X, gaugeFace(line), GAUGES[line].z], P)
        if (Math.hypot(px - cx, py - cy) < GAUGE_R * scale * 1.2) return line
      }
      return null
    }
    const onMove = (event) => {
      const next = gaugeAt(toViewBox(svg, VIEW, event))
      if (next !== st.hover) {
        st.hover = next
        draw()
      }
    }
    const onLeave = () => {
      st.hover = null
      draw()
    }
    const onClick = () => pick(st.context + 1)
    const onKey = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === ' ' || event.key === 'Enter') pick(st.context + 1)
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') pick(st.context - 1)
      else if (/^[1-6]$/.test(event.key)) pick(Number(event.key) - 1)
      else return
      event.preventDefault()
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('click', onClick)
    root.addEventListener('keydown', onKey)
    void SWITCH
    return () => {
      loop.stop()
      clearTimeout(idle)
      Object.values(needles).forEach((n) => n.path.parentNode.remove())
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKey)
    }
  }, [readout])

  return (
    <div ref={stage} className="iso-stage" tabIndex={0} role="group" aria-label="Off-task detection: a short line and a long line scored against human coders. Click, or press the arrow keys or 1 to 6, to change the lesson context. Hover a gauge for its line.">
      <svg className="iso-svg" viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} role="img" aria-label={LABEL}>
        {SEGMENTS.map((segment, i) =>
          typeof segment === 'string' ? <g key={i} ref={(el) => (statics.current[i] = el)} /> : <g key={i} ref={slot[segment.slot]} data-slot={segment.slot} />
        )}
      </svg>
    </div>
  )
}
