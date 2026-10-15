import { useEffect, useRef } from 'react'
import { lineSvg } from '../kit/iso-kit.mjs'
import { SEGMENTS, VIEW, LABEL } from './art.generated.js'
import { HUB, PATH, robotSvg, ballSvg, exitPoint, arcOf, trailOf } from './scene.js'
import { solve, movingAverage, MAX_SCOPED_VELOCITY } from './model.js'
import { fillStatics, startLoop, toViewBox, prefersStill, follow } from '../live.js'

const ACCEL = 3 // m/s², how hard the figure's driver speeds up and slows down
const FIRE_EVERY = 0.45 // s between shots while aimed (a figure choice, not a robot number)
const HEADING_TOLERANCE = 0.03 // rad, the comp heading tolerance before feeding
const HOOD_TOLERANCE = 0.005 * 360 // 0.005 rotations, in degrees
// The idle tour: hold still, cross right, hold, cross left.
const TOUR = [
  [0, 2.2],
  [MAX_SCOPED_VELOCITY, null],
  [0, 1.8],
  [-MAX_SCOPED_VELOCITY, null],
]
const HUB_M = [HUB.x / 100, HUB.y / 100]

export default function ShooterFigure({ readout }) {
  const stage = useRef(null)
  const statics = useRef([])
  const world = useRef(null)

  useEffect(() => {
    const root = stage.current
    const svg = root.querySelector('svg')
    fillStatics(statics.current, SEGMENTS)
    const still = prefersStill()
    const fx = movingAverage()
    const st = {
      x: -60, // cm along the path
      v: 0, // m/s, true
      vf: 0, // m/s, after the robot's 5-tap filter
      target: 0,
      heading: 0,
      hood: 73,
      wheelYaw: 0,
      spin: 0,
      loopClock: 0,
      sinceShot: 0,
      balls: [],
      trail: '',
      tour: !still,
      tourStep: 0,
      tourClock: 0,
      shot: null,
    }
    let idle = 0

    const aimNow = () => solve([st.x / 100, PATH.y / 100], [st.vf, 0], HUB_M)

    function step(dt) {
      // Tour or the reader sets the target speed.
      if (st.tour) {
        st.tourClock += dt
        const [speed, hold] = TOUR[st.tourStep % TOUR.length]
        st.target = speed
        const reachedEnd = (speed > 0 && st.x >= PATH.to - 1) || (speed < 0 && st.x <= PATH.from + 1)
        if ((hold !== null && st.tourClock >= hold) || reachedEnd) {
          st.tourStep++
          st.tourClock = 0
        }
      }
      // Stop at the ends of the path.
      let target = st.target
      if ((target > 0 && st.x >= PATH.to) || (target < 0 && st.x <= PATH.from)) target = 0
      const dv = Math.max(-ACCEL * dt, Math.min(ACCEL * dt, target - st.v))
      st.v = still ? target : st.v + dv
      st.x = Math.max(PATH.from, Math.min(PATH.to, st.x + st.v * 100 * dt))
      if (Math.abs(st.v) > 0.05) st.wheelYaw = st.v > 0 ? 0 : Math.PI
      // The robot's filter samples every 20 ms loop.
      st.loopClock += dt
      while (st.loopClock >= 0.02) {
        st.vf = fx(st.v)
        st.loopClock -= 0.02
      }
      const aim = aimNow()
      st.shot = aim
      // Drivebase heading and hood chase the solution.
      let dh = aim.heading - st.heading
      dh = Math.atan2(Math.sin(dh), Math.cos(dh))
      st.heading = still ? aim.heading : st.heading + dh * (1 - Math.exp(-dt / 0.09))
      st.hood = follow(st.hood, aim.hood, dt, 0.08, still)
      st.spin += dt * aim.speed * 2
      // Feed a ball once both are on target.
      st.sinceShot += dt
      const aimed = Math.abs(dh) < HEADING_TOLERANCE && Math.abs(aim.hood - st.hood) < HOOD_TOLERANCE
      if (aimed && st.sinceShot >= FIRE_EVERY && !still) {
        const exit = exitPoint(st.x, PATH.y, st.heading, st.hood)
        st.balls.push({ age: 0, arc: arcOf(exit, aim.distance) })
        st.sinceShot = 0
      }
      st.trail = trailOf(arcOf(exitPoint(st.x, PATH.y, aim.heading, aim.hood), aim.distance))
      for (const ball of st.balls) ball.age += dt
      st.balls = st.balls.filter((ball) => ball.age < ball.arc.tof)
      return true
    }

    function draw() {
      const parts = [lineSvg(st.trail, { tone: 'lit', dotted: true })]
      for (const ball of st.balls) {
        const p = ball.arc.at(ball.age)
        // Inside the mouth once it drops below the rim.
        const inside = ball.age > ball.arc.tof * 0.5 && p[2] < HUB.entry + 1 && Math.hypot(p[0] - HUB.x, p[1] - HUB.y) < HUB.mouth
        if (!inside) parts.push(ballSvg(p))
      }
      parts.push(robotSvg({ x: st.x, y: PATH.y, heading: st.heading, wheelYaw: st.wheelYaw, hood: st.hood, spin: st.spin, firing: st.balls.length > 0 }))
      world.current.innerHTML = parts.join('')
      const a = st.shot ?? aimNow()
      const text = `${a.distance.toFixed(1)} m · ${Math.abs(st.v).toFixed(1)} m/s · lead ${Math.abs(a.lead).toFixed(0)}° · hood ${a.hood.toFixed(0)}°`
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
      }, 5000)
    }
    // Pointer across the plate sets the drive speed, left to right.
    const onMove = (event) => {
      const [px] = toViewBox(svg, VIEW, event)
      const share = Math.max(0, Math.min(1, (px / VIEW.W - 0.15) / 0.7))
      takeOver()
      st.target = (share * 2 - 1) * MAX_SCOPED_VELOCITY
      loop.run()
    }
    const onLeave = () => {
      st.target = 0
    }
    const onKey = (event) => {
      if (event.key === 'ArrowRight') st.target = Math.min(MAX_SCOPED_VELOCITY, st.target + 0.5)
      else if (event.key === 'ArrowLeft') st.target = Math.max(-MAX_SCOPED_VELOCITY, st.target - 0.5)
      else if (event.key === ' ' || event.key === '0' || event.key === 'Home') st.target = 0
      else return
      event.preventDefault()
      takeOver()
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
    <div ref={stage} className="iso-stage" tabIndex={0} role="group" aria-label="2026 robot shooting on the move. Move the pointer across, or use the arrow keys, to set its speed. Space stops it.">
      <svg className="iso-svg" viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} role="img" aria-label={LABEL}>
        {SEGMENTS.map((segment, i) =>
          typeof segment === 'string' ? <g key={i} ref={(el) => (statics.current[i] = el)} /> : <g key={i} ref={world} data-slot={segment.slot} />
        )}
      </svg>
    </div>
  )
}
