import { useEffect, useRef } from 'react'
import { translateAlong, iso } from '../kit/iso-kit.mjs'
import { SEGMENTS, VIEW, LABEL, STAGE } from './art.generated.js'
import { P, LEVERS, leverSvg, leverParts, leverDepth, armSvg, strapSvg, SCREEN } from './scene.js'
import {
  STATES, createSuperstructure, request, advance, leverTargets, elevatorReached, pivotReached,
  poleDetected, holding, settled, tick,
} from './model.js'

// Robot seconds per screen second. The real STOW to L4 route takes about 1.6 s.
const SPEED = 0.34
// The idle tour: each request waits for the last one to settle, then a beat.
const TOUR = ['SCORE_L4', 'STOW', 'L2', 'SCORE_L3', 'INTAKE', 'CLIMB', 'STOW']
const PAUSE = 1.6
const RESUME_AFTER = 7000
const name = (state) => state.toLowerCase()

export default function SuperstructureFigure({ readout }) {
  const stage = useRef(null)
  const live = useRef(null)
  const slot = { levers: useRef(null), strap: useRef(null), stage: useRef(null), arm: useRef(null) }

  const statics = useRef([])

  useEffect(() => {
    const root = stage.current
    const svg = root.querySelector('svg')
    // The static art is written here, once, rather than through React, so the
    // lamps, flags and screen text queried below are the nodes on the page.
    SEGMENTS.forEach((segment, i) => {
      const g = statics.current[i]
      if (typeof segment === 'string' && g && g.dataset.filled !== '1') {
        g.innerHTML = segment
        g.dataset.filled = '1'
      }
    })
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const s = createSuperstructure('STOW')
    const pull = leverTargets(s).slice()
    const drawn = { levers: [], order: '', arm: '', strap: '', e: null }

    // Static parts the loop writes to.
    const leverLamps = [...svg.querySelectorAll('.an-lens[data-lamp]')].filter((el) => /^\d+$/.test(el.dataset.lamp))
    const lamp = (key) => svg.querySelector(`.an-lens[data-lamp="${key}"]`)
    const flags = [...svg.querySelectorAll('.an-flag[data-flag]')]
    const line0 = svg.querySelector('.an-text[data-line="0"]')
    const line1 = svg.querySelector('.an-text[data-line="1"]')
    const caret = svg.querySelector('.an-caret')

    // One <g> per lever inside the levers slot, reordered by depth.
    const leverGroups = Array.from({ length: LEVERS }, (_, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.dataset.lever = i
      slot.levers.current.appendChild(g)
      return g
    })
    slot.stage.current.innerHTML = STAGE

    let hover = -1
    let touring = !still.matches
    let tourStep = 0
    let restAt = 0
    let clock = 0
    let idleTimer = 0
    let frame = 0
    let last = 0
    let visible = false

    const setOn = (el, value) => {
      if (!el) return
      if (value) el.setAttribute('data-on', value === true ? '' : value)
      else el.removeAttribute('data-on')
    }
    const writeText = (el, text) => {
      if (el && el.textContent !== text) el.textContent = text
    }

    function draw() {
      const e = s.elevator.x
      const asked = s.target !== s.current
      // Levers: rebuild only those that moved or changed their accent.
      for (let i = 0; i < LEVERS; i++) {
        const lit = STATES[i] === s.current
        const key = `${pull[i].toFixed(3)}|${lit}|${hover === i}`
        if (drawn.levers[i] !== key) {
          leverGroups[i].innerHTML = leverSvg(i, pull[i], { lit, hover: hover === i })
          drawn.levers[i] = key
        }
      }
      const order = Array.from({ length: LEVERS }, (_, i) => i).sort((a, b) => leverDepth(a, pull[a]) - leverDepth(b, pull[b]))
      const orderKey = order.join(',')
      if (orderKey !== drawn.order) {
        const frag = document.createDocumentFragment()
        order.forEach((i) => frag.appendChild(leverGroups[i]))
        slot.levers.current.appendChild(frag)
        drawn.order = orderKey
      }
      // Carriage, strap and arm.
      if (drawn.e !== e) {
        slot.stage.current.setAttribute('transform', translateAlong(P, [0, 0, e]))
        const strap = strapSvg(e)
        if (strap !== drawn.strap) slot.strap.current.innerHTML = drawn.strap = strap
        drawn.e = e
      }
      const arm = armSvg(s.pivot.x, s.tongue.x, e, { poles: poleDetected(s) })
      if (arm !== drawn.arm) slot.arm.current.innerHTML = drawn.arm = arm
      // Lamps and lock flags.
      leverLamps.forEach((el) => {
        const i = Number(el.dataset.lamp)
        setOn(el, STATES[i] === s.current ? true : asked && STATES[i] === s.target ? 'asked' : false)
      })
      const held = holding(s)
      flags.forEach((el, i) => setOn(el, asked && STATES[i] === s.target && held !== null))
      setOn(lamp('elevator'), elevatorReached(s))
      setOn(lamp('pivot'), pivotReached(s))
      setOn(lamp('pole'), poleDetected(s))
      // Route display: where it is, and where it was sent.
      writeText(line0, name(s.current))
      const second = asked ? `> ${name(s.target)}` : '>'
      writeText(line1, second)
      if (caret) caret.setAttribute('x', String(SCREEN.x0 + 1 + SCREEN.font * 0.6 * (second.length + 1)))
      // Corner readout.
      const text =
        hover >= 0
          ? `lever ${hover + 1} · ${name(STATES[hover])}`
          : `${name(s.current)} · ${e.toFixed(1)} in · ${Math.round(s.pivot.x)}°` + (held === 'pole' ? ' · waiting on pole' : held === 'loop' ? ' · stow loops to intake' : '')
      if (readout.current && readout.current.textContent !== text) readout.current.textContent = text
    }

    const announce = (text) => {
      if (live.current) live.current.textContent = text
    }

    function step(dt) {
      const calm = still.matches
      if (touring && settled(s)) {
        restAt += dt
        if (restAt > PAUSE) {
          request(s, TOUR[tourStep % TOUR.length])
          tourStep++
          restAt = 0
        }
      }
      if (calm) {
        for (let i = 0; i < 1500 && !settled(s); i++) tick(s)
      } else advance(s, dt * SPEED)
      const want = leverTargets(s)
      let moving = false
      for (let i = 0; i < LEVERS; i++) {
        const next = calm ? want[i] : pull[i] + (want[i] - pull[i]) * (1 - Math.exp(-dt / 0.12))
        pull[i] = Math.abs(want[i] - next) < 0.002 ? want[i] : next
        if (pull[i] !== want[i]) moving = true
      }
      return moving || !settled(s) || touring
    }

    function loop(now) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60
      last = now
      clock += dt
      const keepGoing = step(dt)
      draw()
      frame = visible && keepGoing ? requestAnimationFrame(loop) : 0
    }
    const run = () => {
      if (!frame && visible) {
        last = 0
        frame = requestAnimationFrame(loop)
      }
    }

    const takeOver = () => {
      touring = false
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        touring = !still.matches
        restAt = 0
        run()
      }, RESUME_AFTER)
    }
    const pullLever = (i) => {
      if (i < 0 || i >= LEVERS) return
      takeOver()
      request(s, STATES[i])
      announce(`lever ${i + 1}, ${name(STATES[i])}. route from ${name(s.current)}.`)
      run()
    }

    // Which lever is under the pointer: the nearest lever shaft on screen.
    const toSvg = (event) => {
      const box = svg.getBoundingClientRect()
      return [((event.clientX - box.left) / box.width) * VIEW.W, ((event.clientY - box.top) / box.height) * VIEW.H]
    }
    const leverAt = ([px, py]) => {
      let best = -1
      let bestD = Infinity
      for (let i = 0; i < LEVERS; i++) {
        const { F, s0, knob } = leverParts(i, pull[i])
        const a = iso([F.o[0] + F.a[0] * s0, F.o[1] + F.a[1] * s0, F.o[2] + F.a[2] * s0], P)
        const b = iso(knob[0], P)
        const t = Math.max(0, Math.min(1, ((px - a[0]) * (b[0] - a[0]) + (py - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)))
        const d = Math.hypot(px - (a[0] + t * (b[0] - a[0])), py - (a[1] + t * (b[1] - a[1])))
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      return bestD < 9 ? best : -1
    }
    const onMove = (event) => {
      const next = leverAt(toSvg(event))
      if (next !== hover) {
        hover = next
        root.style.cursor = hover >= 0 ? 'pointer' : 'default'
        draw()
      }
    }
    const onLeave = () => {
      if (hover !== -1) {
        hover = -1
        draw()
      }
    }
    const onClick = (event) => {
      const i = leverAt(toSvg(event))
      if (i >= 0) pullLever(i)
    }
    let cursor = STATES.indexOf('STOW')
    const onKey = (event) => {
      let i = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') i = Math.min(LEVERS - 1, (hover >= 0 ? hover : cursor) + 1)
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') i = Math.max(0, (hover >= 0 ? hover : cursor) - 1)
      else if (event.key === 'Home') i = 0
      else if (event.key === 'End') i = LEVERS - 1
      else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        pullLever(hover >= 0 ? hover : cursor)
        return
      } else if (/^[1-9]$/.test(event.key)) {
        pullLever(Number(event.key) - 1)
        return
      } else if (event.key === 'Escape') {
        hover = -1
        draw()
        return
      }
      if (i === null) return
      event.preventDefault()
      cursor = hover = i
      takeOver()
      draw()
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('click', onClick)
    root.addEventListener('keydown', onKey)

    const obs = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting
        if (visible) run()
      },
      { rootMargin: '120px 0px' }
    )
    obs.observe(root)
    draw()

    return () => {
      obs.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(idleTimer)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKey)
      leverGroups.forEach((g) => g.remove())
    }
  }, [readout])

  return (
    <div
      ref={stage}
      className="iso-stage"
      tabIndex={0}
      role="group"
      aria-label="Superstructure lever frame. Arrow keys pick a lever, Enter pulls it, or press 1 to 9."
    >
      <svg className="iso-svg" viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} role="img" aria-label={LABEL}>
        {SEGMENTS.map((segment, i) =>
          typeof segment === 'string' ? (
            <g key={i} ref={(el) => (statics.current[i] = el)} />
          ) : (
            <g key={i} ref={slot[segment.slot]} data-slot={segment.slot} />
          )
        )}
      </svg>
      <span ref={live} className="bp-sr" aria-live="polite" />
    </div>
  )
}
