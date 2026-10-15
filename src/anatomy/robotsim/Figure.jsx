import { useEffect, useRef } from 'react'
import { SEGMENTS, VIEW, LABEL, TRACE } from './art.generated.js'
import { MODES, switchAngle, weightSvg, drumMark, pendulumSvg, flywheelSpokes, swerveSvg, reelSpokes, switchPointer } from './scene.js'
import { fillStatics, startLoop, prefersStill, setOn, writeText, follow } from '../live.js'

// The code runs in every mode; what it is wired to changes. SIM moves the
// stand-ins, REPLAY turns the reel and leaves the bench still, REAL lights
// the robot connector. The motion is the Worlds Newton Q62 log as replayed
// through SIM-2025, at half speed.
const SPEED = 0.5
const TOUR = [['SIM', 14], ['REPLAY', 6], ['REAL', 5]]
const LENGTH = TRACE.e.length * TRACE.dt

export default function RobotSimFigure({ readout }) {
  const stage = useRef(null)
  const statics = useRef([])
  const slot = { weight: useRef(null), drum: useRef(null), pendulum: useRef(null), flywheel: useRef(null), swerve: useRef(null), reel: useRef(null), switch: useRef(null) }

  useEffect(() => {
    const root = stage.current
    const svg = root.querySelector('svg')
    fillStatics(statics.current, SEGMENTS)
    const still = prefersStill()
    const q = (sel) => svg.querySelector(sel)
    const io = Object.fromEntries(['elevator', 'pivot', 'intake', 'swerve', 'vision', 'robot'].map((k) => [k, q(`.an-lens[data-io="${k}"]`)]))
    const modeLamps = Object.fromEntries(['real', 'sim', 'replay'].map((k) => [k, q(`.an-lens[data-mode="${k}"]`)]))
    const mc = [...svg.querySelectorAll('.an-lens[data-mc]')]
    const line0 = q('.an-text[data-line="0"]')
    const line1 = q('.an-text[data-line="1"]')

    const st = {
      mode: 'SIM',
      t: 20.4, // starts on the L4 score
      tour: !still,
      tourStep: 0,
      tourClock: 0,
      knob: switchAngle('SIM'),
      pose: null, // what the stand-ins show; frozen outside SIM
      drum: 0,
      fly: 0,
      wheel: 0,
      reel: 0,
      drawn: {},
    }
    let idle = 0

    const sample = (t) => {
      const i = Math.min(TRACE.e.length - 1, Math.max(0, Math.floor(t / TRACE.dt)))
      const j = Math.min(TRACE.e.length - 1, i + 1)
      const u = t / TRACE.dt - i
      const mix = (a) => a[i] + (a[j] - a[i]) * Math.min(1, Math.max(0, u))
      return { e: mix(TRACE.e), th: mix(TRACE.th), v: TRACE.v[i], dir: TRACE.dir[i], roll: TRACE.roll[i], target: TRACE.names[TRACE.target[i]], i }
    }
    st.pose = sample(st.t)

    function step(dt) {
      if (st.tour) {
        st.tourClock += dt
        const [, hold] = TOUR[st.tourStep % TOUR.length]
        if (st.tourClock >= hold) {
          st.tourStep++
          st.tourClock = 0
          st.mode = TOUR[st.tourStep % TOUR.length][0]
        }
      }
      if (!still) st.t = (st.t + dt * SPEED) % LENGTH
      const now = sample(st.t)
      st.code = now
      if (st.mode === 'SIM') {
        if (!still) {
          st.fly += now.roll * dt * 9
          st.wheel += now.v * dt * SPEED * 12
        }
        st.pose = now
      }
      if (st.mode === 'REPLAY' && !still) st.reel += dt * 1.6
      st.knob = follow(st.knob, switchAngle(st.mode), dt, 0.12, still)
      return true
    }

    function draw() {
      const p = st.pose
      const c = st.code ?? p
      const put = (key, markup) => {
        if (st.drawn[key] !== markup) {
          slot[key].current.innerHTML = markup
          st.drawn[key] = markup
        }
      }
      put('weight', weightSvg(p.e))
      put('drum', drumMark(p.e))
      put('pendulum', pendulumSvg(p.th))
      put('flywheel', flywheelSpokes(st.fly))
      put('swerve', swerveSvg(p.dir - Math.PI / 2, st.wheel))
      put('reel', reelSpokes(st.reel))
      put('switch', switchPointer(st.knob))
      const sim = st.mode === 'SIM'
      const prev = st.prevPose ?? p
      setOn(io.elevator, sim && Math.abs(p.e - prev.e) > 0.01)
      setOn(io.pivot, sim && Math.abs(p.th - prev.th) > 0.05)
      setOn(io.intake, sim && p.roll !== 0)
      setOn(io.swerve, sim && p.v > 0.1)
      setOn(io.vision, sim)
      setOn(io.robot, st.mode === 'REAL')
      for (const m of ['real', 'sim', 'replay']) setOn(modeLamps[m], st.mode === m.toUpperCase())
      // The motor controllers carry the code's outputs in every mode.
      const cprev = st.prevCode ?? c
      const busy = [...Array(8).fill(c.v > 0.1), Math.abs(c.e - cprev.e) > 0.01, Math.abs(c.e - cprev.e) > 0.01, Math.abs(c.th - cprev.th) > 0.05, c.roll !== 0]
      mc.forEach((el) => setOn(el, busy[Number(el.dataset.mc)]))
      st.prevPose = p
      st.prevCode = c
      writeText(line0, st.mode.toLowerCase())
      writeText(line1, `> ${c.target}`)
      const text =
        st.mode === 'SIM'
          ? `sim · ${c.target} · ${c.e.toFixed(1)} in · ${Math.round(c.th)}° · ${c.v.toFixed(1)} m/s`
          : st.mode === 'REPLAY'
            ? `replay · ${c.target} · read from the match log`
            : `real · ${c.target} · wired to the robot`
      if (readout.current && readout.current.textContent !== text) readout.current.textContent = text
    }

    const loop = startLoop(root, { step, draw })
    const takeOver = () => {
      st.tour = false
      clearTimeout(idle)
      idle = setTimeout(() => {
        st.tour = !still
        st.tourClock = 0
        st.tourStep = TOUR.findIndex(([m]) => m === st.mode)
        loop.run()
      }, 7000)
    }
    const setMode = (m) => {
      st.mode = m
      takeOver()
      loop.run()
    }
    const next = (d) => setMode(MODES[(MODES.indexOf(st.mode) + d + MODES.length) % MODES.length])
    const onClick = () => next(1)
    const onKey = (event) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === ' ' || event.key === 'Enter') next(1)
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next(-1)
      else if (event.key === '1') setMode('REAL')
      else if (event.key === '2') setMode('SIM')
      else if (event.key === '3') setMode('REPLAY')
      else return
      event.preventDefault()
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
    <div ref={stage} className="iso-stage" tabIndex={0} role="group" aria-label="The robot's real code on a test bench. Click, or press the arrow keys or 1, 2, 3, to switch between REAL, SIM and REPLAY.">
      <svg className="iso-svg" viewBox={`0 0 ${VIEW.W} ${VIEW.H}`} role="img" aria-label={LABEL}>
        {SEGMENTS.map((segment, i) =>
          typeof segment === 'string' ? <g key={i} ref={(el) => (statics.current[i] = el)} /> : <g key={i} ref={slot[segment.slot]} data-slot={segment.slot} />
        )}
      </svg>
    </div>
  )
}
