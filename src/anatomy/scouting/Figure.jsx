import { useEffect, useRef } from 'react'
import { SEGMENTS, VIEW, LABEL } from './art.generated.js'
import { DESKS, tripOf, capsulesSvg, traySvg, rackSvg, clockHandSvg, at } from './scene.js'
import { MATCH_SECONDS, AUTO_HOLD, SHOT_KEYS, phaseAt, clockText } from './model.js'
import { fillStatics, startLoop, toViewBox, prefersStill, setOn, writeText } from '../live.js'

// One match after another, sped up. The clock and phases are the app's; the
// tallies and rankings are made up for the figure.
const MATCH_SPEED = 20 // the 160 s match plays in 8 s
const PAGED = 1.4 // s the desks' reminder lamps show before the match
const FILED = 1.4 // s the full board shows before the next match
const CAPSULE_SPEED = 90 // units a second along the tube
const OUTAGE = 2.8 // s a desk's line is down in the tour
const FIRST_MATCH = 12

// A small seeded generator, so each match's taps repeat.
function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// Each robot scout's taps through a match: [match second, +1/+5/+20].
function tapsFor(match, desk) {
  const rand = seeded(match * 31 + desk * 7 + 1)
  const taps = []
  for (let t = 4 + rand() * 6; t < MATCH_SECONDS - 2; t += 3 + rand() * 9) taps.push([t, SHOT_KEYS[Math.floor(Math.pow(rand(), 2.2) * 3)]])
  return taps
}
function shuffled(match, desk) {
  const rand = seeded(match * 13 + desk)
  const order = [0, 1, 2]
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export default function ScoutingFigure({ readout }) {
  const stage = useRef(null)
  const statics = useRef([])
  const slot = { rack_qualRed: useRef(null), rack_qualBlue: useRef(null), tray: useRef(null), clock: useRef(null), capsules: useRef(null) }

  useEffect(() => {
    const root = stage.current
    const svg = root.querySelector('svg')
    fillStatics(statics.current, SEGMENTS)
    const still = prefersStill()
    const q = (sel) => svg.querySelector(sel)
    const counterEl = Object.fromEntries(DESKS.map((d) => [d.key, q(`.an-text[data-count="${d.key}"]`)]))
    const deskLamp = Object.fromEntries(DESKS.map((d) => [d.key, q(`.an-lens[data-desk="${d.key}"]`)]))
    const roleLamp = Object.fromEntries(DESKS.map((d) => [d.key, q(`.an-lens[data-role="${d.key}"]`)]))
    const matchEl = q('.an-text[data-match]')
    const trips = DESKS.map(tripOf)
    const quals = DESKS.map((d, i) => ({ d, i })).filter(({ d }) => d.kind === 'alliance')

    const st = {
      mode: 'paged',
      clock: 0, // s in the mode
      t: 0, // match seconds
      held: 0, // s of the auto-to-teleop hold used
      match: FIRST_MATCH,
      counts: DESKS.map(() => 0),
      taps: [],
      ranks: quals.map(() => [0, 1, 2]), // card i's slot
      places: quals.map(() => [0, 1, 2]), // drawn, sliding toward ranks
      sendAt: [],
      state: DESKS.map(() => 'idle'), // idle, waiting, queued, flying, in
      s: DESKS.map(() => 0),
      down: DESKS.map(() => false), // the line is down
      downFor: DESKS.map(() => 0), // tour outage left, s
      manual: false,
      drawn: {},
    }
    let idle = 0

    function startMatch() {
      st.mode = 'paged'
      st.clock = 0
      st.t = 0
      st.held = 0
      st.counts = DESKS.map(() => 0)
      st.taps = DESKS.map((d, i) => (d.kind === 'robot' ? tapsFor(st.match, i) : []))
      st.state = DESKS.map(() => 'idle')
      st.s = DESKS.map(() => 0)
      const rand = seeded(st.match * 101)
      st.sendAt = DESKS.map(() => 0.3 + rand() * 1.6)
    }
    startMatch()

    function send(i) {
      if (st.down[i]) st.state[i] = 'queued'
      else {
        st.state[i] = 'flying'
        st.s[i] = 0
      }
    }

    function step(dt) {
      st.clock += dt
      if (st.mode === 'paged' && st.clock >= PAGED) {
        st.mode = 'match'
        st.clock = 0
      } else if (st.mode === 'match') {
        // The clock holds 3 s at 20 s, then runs on.
        let left = dt * MATCH_SPEED
        if (st.t >= 20 && st.held < AUTO_HOLD) {
          const use = Math.min(left, AUTO_HOLD - st.held)
          st.held += use
          left -= use
        }
        const before = st.t
        st.t = Math.min(MATCH_SECONDS, st.t + left)
        st.taps.forEach((taps, i) => {
          for (const [at, add] of taps) if (at > before && at <= st.t) st.counts[i] += add
        })
        // The qual scouts rank their alliance as the match ends.
        if (before < 130 && st.t >= 130) quals.forEach(({ i }, n) => (st.ranks[n] = shuffled(st.match, i)))
        if (st.t >= MATCH_SECONDS) {
          st.mode = 'send'
          st.clock = 0
          // In the tour, one desk a match loses its line for a moment.
          if (!st.manual) {
            const i = st.match % DESKS.length
            st.down[i] = true
            st.downFor[i] = OUTAGE
          }
        }
      } else if (st.mode === 'send') {
        DESKS.forEach((_, i) => {
          if (st.state[i] === 'idle' && st.clock >= st.sendAt[i]) send(i)
          if (st.downFor[i] > 0) {
            st.downFor[i] -= dt
            if (st.downFor[i] <= 0) st.down[i] = false
          }
          if (st.state[i] === 'queued' && !st.down[i]) send(i)
          if (st.state[i] === 'flying') {
            st.s[i] += CAPSULE_SPEED * dt
            if (st.s[i] >= trips[i].length) st.state[i] = 'in'
          }
        })
        if (st.state.every((s) => s === 'in')) {
          st.mode = 'filed'
          st.clock = 0
        }
      } else if (st.mode === 'filed' && st.clock >= FILED) {
        st.match++
        startMatch()
      }
      for (let n = 0; n < quals.length; n++) for (let c = 0; c < 3; c++) st.places[n][c] += (st.ranks[n][c] - st.places[n][c]) * (still ? 1 : 1 - Math.exp(-dt / 0.12))
      return !still
    }

    function draw() {
      const put = (key, markup) => {
        if (st.drawn[key] !== markup) {
          slot[key].current.innerHTML = markup
          st.drawn[key] = markup
        }
      }
      quals.forEach(({ d }, n) => put(`rack_${d.key}`, rackSvg(d, st.places[n])))
      const landed = st.state.filter((s) => s === 'in').length
      put('tray', traySvg(landed))
      put('clock', clockHandSvg(st.t))
      put('capsules', capsulesSvg(
        DESKS.map((_, i) => i).filter((i) => st.state[i] === 'flying').map((i) => ({ trip: trips[i], s: st.s[i] })),
        DESKS.filter((_, i) => st.state[i] === 'queued'),
      ))
      DESKS.forEach((d, i) => {
        writeText(counterEl[d.key], String(Math.min(999, st.counts[i])).padStart(3, '0'))
        setOn(deskLamp[d.key], st.state[i] === 'queued' || st.down[i] ? 'asked' : st.mode === 'paged')
        setOn(roleLamp[d.key], st.state[i] === 'in')
      })
      writeText(matchEl, `q${st.match}`)
      const queued = DESKS.filter((_, i) => st.state[i] === 'queued').map((d) => d.name)
      const text =
        st.mode === 'paged'
          ? `q${st.match} · scouts paged`
          : st.mode === 'match'
            ? `q${st.match} · ${st.t >= 20 && st.held < AUTO_HOLD ? 'auto ends' : phaseAt(st.t)} · ${clockText(st.t)}`
            : `q${st.match} · ${landed} of 8 in${queued.length ? ` · ${queued.join(', ')} queued` : ''}`
      if (readout.current && readout.current.textContent !== text) readout.current.textContent = text
    }

    if (still) {
      // One quiet frame: the match is over, seven reports are in, blue 2 waits.
      st.mode = 'send'
      st.t = MATCH_SECONDS
      st.taps.forEach((taps, i) => (st.counts[i] = taps.reduce((sum, [, add]) => sum + add, 0)))
      st.state = DESKS.map((d) => (d.key === 'blue2' ? 'queued' : 'in'))
      st.down = DESKS.map((d) => d.key === 'blue2')
    }
    const loop = startLoop(root, { step, draw })

    // Click (or press 1-8) to cut or restore a desk's line.
    const toggle = (i) => {
      st.manual = true
      st.down[i] = !st.down[i]
      st.downFor[i] = 0
      clearTimeout(idle)
      idle = setTimeout(() => {
        st.manual = false
        st.down = DESKS.map(() => false)
        loop.run()
      }, 9000)
      loop.run()
    }
    const onClick = (event) => {
      const [x, y] = toViewBox(svg, VIEW, event)
      let best = -1
      let bestD = 40
      DESKS.forEach((d, i) => {
        const [px, py] = at([d.x, d.plan.y + d.plan.d / 2, 8])
        const dist = Math.hypot(px - x, py - y)
        if (dist < bestD) (bestD = dist), (best = i)
      })
      if (best >= 0) toggle(best)
    }
    const onKey = (event) => {
      const n = Number(event.key)
      if (n >= 1 && n <= 8) {
        event.preventDefault()
        toggle(n - 1)
      }
    }
    root.addEventListener('click', onClick)
    root.addEventListener('keydown', onKey)
    return () => {
      loop.stop()
      clearTimeout(idle)
      root.removeEventListener('click', onClick)
      root.removeEventListener('keydown', onKey)
    }
  }, [readout])

  return (
    <div ref={stage} className="iso-stage" tabIndex={0} role="group" aria-label="A pneumatic tube station for scouting reports. Click a desk, or press 1 to 8, to cut or restore its line.">
      <svg className="iso-svg" viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} role="img" aria-label={LABEL}>
        {SEGMENTS.map((segment, i) =>
          typeof segment === 'string' ? <g key={i} ref={(el) => (statics.current[i] = el)} /> : <g key={i} ref={slot[segment.slot]} data-slot={segment.slot} />
        )}
      </svg>
    </div>
  )
}
