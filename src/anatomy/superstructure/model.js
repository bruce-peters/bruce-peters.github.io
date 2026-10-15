// The 2025 superstructure state machine, ported line for line from
// Iron-Panthers/SIM-2025 Superstructure.java at 0457264 (Apr 18 2025, branch
// comp/worlds), the last commit before Worlds. Pure JS with no DOM, so the
// build script, the route check and the page all run the same code.
//
// Targets, next-state rules and guards are exact. Motion is an approximation:
// the elevator uses the competition Motion Magic limits (100 in/s, 500 in/s²)
// and the pivot uses limits read off the Worlds Newton Q62 log.

// SuperstructureState in enum order. ZERO only runs at power-on, so the
// figure leaves it out. Lever n on the frame is state n.
export const STATES = [
  'SETUP_L4', 'SCORE_L4', 'SETUP_L3', 'SCORE_L3', 'L2', 'L1', 'TOP',
  'INTAKE', 'STOW', 'CLIMB', 'PREVENT_TIPPING', 'DESCORE_HIGH', 'DESCORE_LOW',
]

// Elevator.ElevatorTarget, in inches of carriage travel.
export const ELEVATOR = {
  BOTTOM: 0.6, L1: 11, L2: 20, L3: 32.4, SETUP_L4: 31.6, SCORE_L4: 30, TOP: 31,
  INTAKE: 0, CLIMB: 13, DESCORE_HIGH: 19.5, DESCORE_LOW: 9.2,
  INTAKE_SIDE: 13, SCORE_SIDE: 13, SAFE_MIDWAY: 11.5,
}

// Pivot.PivotTarget, in degrees. 0 is the arm level, 90 straight up.
export const PIVOT = {
  TOP: -79, INTAKE: -96, STOW: -96, L1: -110, L2: -107, SCORE_L3: -117,
  SETUP_L3: -79, CLIMB: -115, SETUP_L4: 144, SCORE_L4: 149,
  DESCORE_HIGH: 0, INTAKE_SIDE: 40, SCORE_SIDE: 100, DESCORE_LOW: -15,
}

// Tongue.TongueTarget, servo degrees. 0 is out over the reef, 64 tucked.
export const TONGUE = {
  TOP: 64, INTAKE: 64, STOW: 64, L1: 64, L2: 64, L3: 40, L4: 0, CLIMB: 64, DESCORE: 64,
}

// ElevatorConstants / PivotConstants / TongueConstants.
export const ELEVATOR_EPSILON = 1 // in
export const PIVOT_EPSILON = 0.01 * 360 // 0.01 rotations, in degrees
export const TONGUE_EPSILON = 5
export const PIVOT_LENGTH = 25 // in
export const ELEVATOR_LIMIT = 32.5 // in, soft limit
export const PIVOT_ABOVE_CARRIAGE = 33.875 // in, ELEVATOR_TO_PIVOT_TRANSFORM z

export const TICK = 0.02 // the robot loop, 50 Hz

const MOTION = {
  elevator: { speed: 100, accel: 500 },
  pivot: { speed: 400, accel: 2400 },
  tongue: { speed: 220 },
}

export function createSuperstructure(at = 'STOW') {
  return {
    current: at,
    target: at,
    buffer: at,
    elevator: { x: ELEVATOR.BOTTOM, v: 0, target: 'BOTTOM' },
    pivot: { x: PIVOT.STOW, v: 0, target: 'STOW' },
    tongue: { x: TONGUE.STOW, target: 'STOW' },
    route: [at],
    clock: 0,
  }
}

// setTargetState(). The route restarts from wherever the machine is now.
export function request(s, state) {
  if (!STATES.includes(state)) return
  s.target = state
  s.route = [s.current]
}

export const elevatorReached = (s) =>
  Math.abs(s.elevator.x - ELEVATOR[s.elevator.target]) <= ELEVATOR_EPSILON
export const pivotReached = (s) =>
  Math.abs(s.pivot.x - PIVOT[s.pivot.target]) <= PIVOT_EPSILON
export const reached = (s) => elevatorReached(s) && pivotReached(s)

// tongue.poleDetected() is pole1 && pole2. On the robot the two switches close
// when the driver puts the tongue on a reef branch. In the figure the branch
// stands where the tongue lands in the SETUP_L4 pose, so both close once the
// tongue is out and the arm and carriage are there.
export function poleDetected(s) {
  return (
    Math.abs(s.tongue.x - TONGUE.L4) <= TONGUE_EPSILON &&
    Math.abs(s.pivot.x - PIVOT.SETUP_L4) <= PIVOT_EPSILON &&
    Math.abs(s.elevator.x - ELEVATOR.SETUP_L4) <= ELEVATOR_EPSILON
  )
}

// One pass of Superstructure.periodic(): set targets for the current state,
// then take a step if the guard allows it. Mirrors the Java switch.
function periodic(s) {
  s.current = s.buffer
  const e = s.elevator.x
  const p = s.pivot.x
  const target = s.target
  const go = (next) => { s.buffer = next }
  const el = (name) => { s.elevator.target = name }
  const pv = (name) => { s.pivot.target = name }
  const tg = (name) => { s.tongue.target = name }
  const differs = target !== s.current

  switch (s.current) {
    case 'L1': {
      el('L1'); pv('L1'); tg('L1')
      if (reached(s)) {
        if (target === 'L2') go('L2')
        else if (target === 'INTAKE' || target === 'STOW') go('STOW')
        else if (target === 'CLIMB') go('CLIMB')
        else if (differs) go('TOP')
      }
      break
    }
    case 'L2': {
      el('L2'); pv('L2'); tg('L2')
      if (reached(s) && differs) {
        if (target === 'L1') go('L1')
        else if (target === 'INTAKE' || target === 'STOW') go('STOW')
        else if (target === 'CLIMB') go('CLIMB')
        else go('TOP')
      }
      break
    }
    case 'SETUP_L3': {
      if (e > 32) pv('SETUP_L3')
      el('L3'); tg('L3')
      if (reached(s) && differs) {
        if (target === 'SCORE_L3' || target === 'DESCORE_HIGH' || target === 'DESCORE_LOW') go(target)
        else if (target === 'SCORE_L4' || target === 'SETUP_L4') go('PREVENT_TIPPING')
        else go('TOP')
      }
      break
    }
    case 'SCORE_L3': {
      el('L3'); pv('SCORE_L3'); tg('L3')
      if (reached(s) && differs) go('SETUP_L3')
      break
    }
    case 'PREVENT_TIPPING': {
      // Swing the arm over the top with the carriage low, so the robot
      // doesn't tip and the arm clears the intake.
      if (target === 'SETUP_L4' || target === 'SCORE_L4' || target === 'PREVENT_TIPPING') pv('SCORE_SIDE')
      else pv('INTAKE_SIDE')

      if (p > -60 && (s.pivot.target === 'INTAKE_SIDE' || (s.pivot.target === 'SCORE_SIDE' && p < 90))) {
        el('INTAKE_SIDE')
      } else if (target === 'PREVENT_TIPPING') el(p > -60 ? 'INTAKE_SIDE' : 'TOP')
      else if (target === 'SETUP_L4' || target === 'SCORE_L4') el('SETUP_L4')
      else if (target === 'SETUP_L3' || target === 'SCORE_L3') el('L3')
      else el('TOP')

      tg(p > 90 ? 'L4' : 'STOW')

      if (differs && elevatorReached(s) && Math.abs(PIVOT[s.pivot.target] / 360 - p / 360) < 0.05) {
        if (target === 'SETUP_L4' || target === 'SCORE_L4') go('SETUP_L4')
        else if (target === 'DESCORE_HIGH' || target === 'DESCORE_LOW') go(target)
        else go('TOP')
      }
      break
    }
    case 'SETUP_L4': {
      el('SETUP_L4'); pv('SETUP_L4'); tg('L4')
      if (differs && reached(s)) {
        if (target === 'SCORE_L4') { if (poleDetected(s)) go('SCORE_L4') }
        else go('PREVENT_TIPPING')
      }
      break
    }
    case 'SCORE_L4': {
      el('SCORE_L4'); pv('SCORE_L4'); tg('STOW')
      if (differs && reached(s)) {
        if (target === 'SETUP_L4') go('SETUP_L4')
        else go('PREVENT_TIPPING')
      }
      break
    }
    case 'TOP': {
      el('TOP')
      if (e > 5) pv('TOP')
      tg('TOP')
      if (differs && reached(s)) {
        if (target === 'SETUP_L4' || target === 'SCORE_L4' || target === 'PREVENT_TIPPING') go('PREVENT_TIPPING')
        else if (['CLIMB', 'L2', 'L1', 'DESCORE_HIGH', 'DESCORE_LOW'].includes(target)) go(target)
        else if (target === 'SETUP_L3' || target === 'SCORE_L3') go('SETUP_L3')
        else go('STOW')
      }
      break
    }
    case 'STOW': {
      if (p < -0.27) el('BOTTOM')
      if (p < -100 && e < 12) el('SAFE_MIDWAY') // too low with the arm tipped: wait
      pv('STOW'); tg('STOW')
      if (differs && reached(s)) {
        if (['INTAKE', 'L1', 'L2', 'CLIMB'].includes(target)) go(target)
        else go('TOP')
      }
      break
    }
    case 'INTAKE': {
      el('INTAKE'); pv('INTAKE'); tg('INTAKE')
      if (differs && reached(s)) {
        // As written at Worlds, a STOW request from INTAKE stays in INTAKE.
        // The two poses are 0.6 in apart, so it never mattered on the field.
        if (target === 'STOW') go('INTAKE')
        else if (['L1', 'L2', 'CLIMB'].includes(target)) go(target)
        else go('TOP')
      }
      break
    }
    case 'CLIMB': {
      if (e < 27 && e > 4) pv('CLIMB')
      el('CLIMB'); tg('CLIMB')
      if (reached(s) && differs) {
        if (target === 'L1') go('L1')
        else if (target === 'INTAKE' || target === 'STOW') go('STOW')
        else if (target === 'L2') go('L2')
        else go('TOP')
      }
      break
    }
    case 'DESCORE_HIGH':
    case 'DESCORE_LOW': {
      const high = s.current === 'DESCORE_HIGH'
      if (p > -60) el(s.current)
      pv(s.current); tg('DESCORE')
      if (differs && reached(s)) {
        if (target === 'SETUP_L4' || target === 'SCORE_L4' || target === 'PREVENT_TIPPING') go('PREVENT_TIPPING')
        else if (target === (high ? 'DESCORE_LOW' : 'DESCORE_HIGH')) go(target)
        else if (target === 'SETUP_L3' || target === 'SCORE_L3') go('SETUP_L3')
        else go('TOP')
      }
      break
    }
  }
}

// A trapezoidal follower: accelerate toward the goal, never faster than the
// speed that still lets it stop on the goal.
function drive(axis, goal, { speed, accel }, dt) {
  const d = goal - axis.x
  if (Math.abs(d) < 1e-3 && Math.abs(axis.v) < accel * dt) {
    axis.x = goal
    axis.v = 0
    return
  }
  const want = Math.sign(d) * Math.min(speed, Math.sqrt(2 * accel * Math.abs(d)))
  const dv = Math.max(-accel * dt, Math.min(accel * dt, want - axis.v))
  axis.v += dv
  const step = axis.v * dt
  if (Math.abs(step) >= Math.abs(d) && Math.sign(step) === Math.sign(d)) {
    axis.x = goal
    axis.v = 0
  } else axis.x += step
}

function slew(axis, goal, { speed }, dt) {
  const d = goal - axis.x
  const step = speed * dt
  axis.x = Math.abs(d) <= step ? goal : axis.x + Math.sign(d) * step
}

// One 20 ms robot loop.
export function tick(s) {
  periodic(s)
  if (s.buffer !== s.current && s.route[s.route.length - 1] !== s.buffer) s.route.push(s.buffer)
  drive(s.elevator, ELEVATOR[s.elevator.target], MOTION.elevator, TICK)
  drive(s.pivot, PIVOT[s.pivot.target], MOTION.pivot, TICK)
  slew(s.tongue, TONGUE[s.tongue.target], MOTION.tongue, TICK)
  s.clock += TICK
}

// Advance by dt seconds of robot time in whole loops. Returns the loops run.
export function advance(s, dt) {
  s.carry = (s.carry || 0) + dt
  let n = 0
  while (s.carry >= TICK) {
    tick(s)
    s.carry -= TICK
    n++
  }
  return n
}

// True once the machine has arrived where it was sent and nothing is moving.
export function settled(s) {
  return (
    s.buffer === s.current &&
    s.current === s.target &&
    s.elevator.v === 0 &&
    s.pivot.v === 0 &&
    s.elevator.x === ELEVATOR[s.elevator.target] &&
    s.pivot.x === PIVOT[s.pivot.target] &&
    s.tongue.x === TONGUE[s.tongue.target]
  )
}

// What the next step is waiting on, for the readout and the lock flag.
export function holding(s) {
  if (s.current === s.target) return null
  if (s.current === 'INTAKE' && s.target === 'STOW') return 'loop'
  if (s.current === 'SETUP_L4' && s.target === 'SCORE_L4' && reached(s) && !poleDetected(s)) return 'pole'
  if (!elevatorReached(s)) return 'elevator'
  if (!pivotReached(s)) return 'pivot'
  return null
}

// Lever positions: the current state's lever is pulled over (1), a requested
// lever not yet reached waits at its check lock (0.5), the rest are home (0).
export function leverTargets(s) {
  return STATES.map((name) => (name === s.current ? 1 : name === s.target ? 0.5 : 0))
}

// Run from a state to a request until it settles (or gives up), for the route
// check and for laying out the idle tour.
export function simulate(from, to, { seconds = 12 } = {}) {
  const s = createSuperstructure(from)
  if (from !== 'STOW') {
    // Park the axes on the starting pose first.
    s.target = from
    for (let i = 0; i < 2000 && !settled(s); i++) tick(s)
  }
  request(s, to)
  const loops = Math.round(seconds / TICK)
  for (let i = 0; i < loops; i++) {
    tick(s)
    if (settled(s)) break
  }
  return s
}
