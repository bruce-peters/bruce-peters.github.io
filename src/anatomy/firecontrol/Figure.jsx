import { useEffect, useRef } from 'react'
import { SEGMENTS, VIEW, LABEL } from './art.generated.js'
import { WHEELS, wheelAngle, RANGE_LIMITS, wheelSvg, carriageSvg, rodTopsSvg, solverSvg, quadrantSvg, needlesSvg } from './scene.js'
import { solve, movingAverage, MAX_SCOPED_VELOCITY } from './model.js'
import { fillStatics, startLoop, toViewBox, prefersStill, follow, setOn, writeText } from '../live.js'

// The robot is described in the hub's frame: range r (m) and its velocity
// [toward the hub, across] (m/s). The computer solves the code's shot from
// that, every 20 ms like the robot loop, through the same 5-tap filter.
const LOOP = 0.02
const HEADING_TOLERANCE = 0.03 / (Math.PI / 180) // the comp heading tolerance, 0.03 rad, in degrees
const HOOD_TOLERANCE = 0.005 * 360 // 0.005 rotations, in degrees
const TURN = 0.16 // s, how fast the figure's drivebase and hood follow the order (a figure choice)
const ACCEL = 3 // m/s², how hard the figure's driver speeds up and slows down
// The idle tour drives an ellipse round the hub, nearest 1.6 m, farthest
// 4.6 m, at a steady 1.35 m/s, stopping now and then.
const ELLIPSE = [1.6, 4.6]
const CRUISE = 1.35
const TOUR = [[0, 1.8], [CRUISE, 4.5], [0, 1.4], [CRUISE, 5]]

export default function FireControlFigure({ readout }) {
  const stage = useRef(null)
  const statics = useRef([])
  const slot = {
    wheel_range: useRef(null), wheel_speed: useRef(null), wheel_course: useRef(null),
    carriage: useRef(null), solver: useRef(null), quadrant: useRef(null), needles: useRef(null),
  }

  useEffect(() => {
    const root = stage.current
    const svg = root.querySelector('svg')
    fillStatics(statics.current, SEGMENTS)
    const still = prefersStill()
    const counters = Object.fromEntries(WHEELS.map(({ key }) => [key, svg.querySelector(`.an-text[data-counter="${key}"]`)]))
    const lamp = svg.querySelector('.an-lens[data-fire]')
    const fx = movingAverage()
    const fy = movingAverage()
    const st = {
      phi: 0, // the tour's place on the ellipse
      speed: 0, // m/s along the ellipse
      r: 2.7,
      v: [0, 0], // true velocity, hub frame
      vf: [0, 0], // after the filter
      aim: { r: 2.7, v: [0, 0] }, // what the reader asks for
      tour: !still,
      tourStep: 0,
      tourClock: 0,
      clock: 0,
      heading: 0, // degrees off the hub line, following the order
      hood: 73,
      course: 180,
      sol: null,
      drawn: {},
    }
    let idle = 0

    const ellipse = (phi) => [ELLIPSE[0] * Math.cos(phi), ELLIPSE[1] * Math.sin(phi)]
    // Hub-frame state from a place on the ellipse and a speed along it.
    function onEllipse(phi, speed) {
      const p = ellipse(phi)
      const r = Math.hypot(p[0], p[1])
      const dp = [-ELLIPSE[0] * Math.sin(phi), ELLIPSE[1] * Math.cos(phi)]
      const len = Math.hypot(dp[0], dp[1])
      const vel = [(dp[0] / len) * speed, (dp[1] / len) * speed]
      const toward = [-p[0] / r, -p[1] / r]
      const across = [-toward[1], toward[0]]
      return { r, v: [vel[0] * toward[0] + vel[1] * toward[1], vel[0] * across[0] + vel[1] * across[1]], len }
    }

    function step(dt) {
      if (st.tour) {
        st.tourClock += dt
        const [speed, hold] = TOUR[st.tourStep % TOUR.length]
        if (st.tourClock >= hold) {
          st.tourStep++
          st.tourClock = 0
        }
        st.speed = still ? 0 : st.speed + Math.max(-ACCEL * dt, Math.min(ACCEL * dt, speed - st.speed))
        const here = onEllipse(st.phi, st.speed)
        st.phi += (st.speed * dt) / here.len
        st.r = here.r
        st.v = here.v
      } else {
        st.r = follow(st.r, st.aim.r, dt, 0.25, still)
        for (const i of [0, 1]) st.v[i] = st.v[i] + Math.max(-ACCEL * dt, Math.min(ACCEL * dt, st.aim.v[i] - st.v[i]))
        if (still) st.v = [...st.aim.v]
      }
      // The robot loop: filter, then solve, every 20 ms.
      st.clock += dt
      while (st.clock >= LOOP || !st.sol) {
        st.clock = Math.max(0, st.clock - LOOP)
        st.vf = [fx(st.v[0]), fy(st.v[1])]
        st.sol = solve([-st.r, 0], st.vf, [0, 0])
      }
      const s = st.sol
      st.heading = follow(st.heading, s.lead, dt, TURN, still)
      st.hood = follow(st.hood, s.hood, dt, TURN, still)
      const speed = Math.hypot(st.vf[0], st.vf[1])
      if (speed > 0.05) st.course = ((Math.atan2(st.vf[1], st.vf[0]) / (Math.PI / 180)) + 360) % 360
      // Under reduced motion, one step per input and then rest.
      return !still
    }

    function draw() {
      const s = st.sol
      if (!s) return
      const put = (key, markup) => {
        if (st.drawn[key] !== markup) {
          slot[key].current.innerHTML = markup
          st.drawn[key] = markup
        }
      }
      const speed = Math.hypot(st.vf[0], st.vf[1])
      put('wheel_range', wheelSvg(WHEELS[0].x, wheelAngle.range(s.distance)))
      put('wheel_speed', wheelSvg(WHEELS[1].x, wheelAngle.speed(speed)))
      put('wheel_course', wheelSvg(WHEELS[2].x, wheelAngle.course(st.course)))
      const range = Math.max(RANGE_LIMITS[0], Math.min(RANGE_LIMITS[1], s.distance))
      put('carriage', carriageSvg(range) + rodTopsSvg(range))
      // The solver's reversed velocity points opposite the robot's travel.
      const back = (st.course + 180) * (Math.PI / 180)
      put('solver', solverSvg(s.vh, [-st.vf[0], -st.vf[1]], back))
      put('quadrant', quadrantSvg(s.horizontal, s.vv, st.hood))
      put('needles', needlesSvg(s.lead, st.heading, s.speed))
      writeText(counters.range, s.distance.toFixed(2))
      writeText(counters.speed, speed.toFixed(2))
      writeText(counters.course, String(Math.round(st.course) % 360).padStart(3, '0'))
      const ready = Math.abs(st.heading - s.lead) < HEADING_TOLERANCE && Math.abs(st.hood - s.hood) < HOOD_TOLERANCE
      setOn(lamp, ready)
      const text = `${s.distance.toFixed(1)} m · ${speed.toFixed(1)} m/s · lead ${Math.round(s.lead)}° · hood ${Math.round(s.hood)}°`
      if (readout.current && readout.current.textContent !== text) readout.current.textContent = text
    }

    const loop = startLoop(root, { step, draw })
    const takeOver = () => {
      if (st.tour) {
        st.aim = { r: st.r, v: [...st.v] }
        st.tour = false
      }
      clearTimeout(idle)
      idle = setTimeout(() => {
        // Back to the tour from the nearest point of the ellipse at this range.
        const want = st.r
        let best = 0
        let err = Infinity
        for (let i = 0; i < 360; i++) {
          const phi = (i / 360) * 2 * Math.PI
          const e = Math.abs(Math.hypot(...ellipse(phi)) - want)
          if (e < err) (err = e), (best = phi)
        }
        st.phi = best
        st.speed = Math.hypot(...st.v)
        st.tour = !still
        st.tourStep = 1
        st.tourClock = 0
        loop.run()
      }, 6000)
    }
    // Left and right strafe across the hub line; up and down set the range.
    const onMove = (event) => {
      const [x, y] = toViewBox(svg, VIEW, event)
      const across = Math.max(-1, Math.min(1, (x / VIEW.W - 0.5) * 2.4)) * MAX_SCOPED_VELOCITY
      const r = RANGE_LIMITS[1] - Math.max(0, Math.min(1, (y / VIEW.H - 0.12) / 0.76)) * (RANGE_LIMITS[1] - RANGE_LIMITS[0])
      takeOver()
      st.aim = { r, v: [0, across] }
      loop.run()
    }
    const onLeave = () => {
      if (!st.tour) st.aim = { r: st.aim.r, v: [0, 0] }
      loop.run()
    }
    const onKey = (event) => {
      const nudge = { ArrowLeft: [0, -0.25], ArrowRight: [0, 0.25], ArrowUp: [0.25, 0], ArrowDown: [-0.25, 0] }[event.key]
      if (!nudge) return
      event.preventDefault()
      takeOver()
      st.aim = {
        r: Math.max(RANGE_LIMITS[0], Math.min(RANGE_LIMITS[1], st.aim.r + nudge[0])),
        v: [0, Math.max(-MAX_SCOPED_VELOCITY, Math.min(MAX_SCOPED_VELOCITY, st.aim.v[1] + nudge[1]))],
      }
      loop.run()
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('keydown', onKey)
    return () => {
      loop.stop()
      clearTimeout(idle)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('keydown', onKey)
    }
  }, [readout])

  return (
    <div ref={stage} className="iso-stage" tabIndex={0} role="group" aria-label="A fire-control computer for the robot's shot. Move across it, or use the arrow keys, to strafe and change range.">
      <svg className="iso-svg" viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} role="img" aria-label={LABEL}>
        {SEGMENTS.map((segment, i) =>
          typeof segment === 'string' ? <g key={i} ref={(el) => (statics.current[i] = el)} /> : <g key={i} ref={slot[segment.slot]} data-slot={segment.slot} />
        )}
      </svg>
    </div>
  )
}
