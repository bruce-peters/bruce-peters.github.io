// Checks the anatomy model against the Worlds superstructure code.
// Expected routes were traced by hand through Superstructure.java at 0457264.
// Run: node scripts/check-superstructure.mjs
import {
  STATES, ELEVATOR, simulate, createSuperstructure, request, tick, holding, poleDetected,
} from '../src/anatomy/superstructure/model.js'

const ROUTES = [
  ['STOW', 'SCORE_L4', ['STOW', 'TOP', 'PREVENT_TIPPING', 'SETUP_L4', 'SCORE_L4']],
  ['STOW', 'SETUP_L4', ['STOW', 'TOP', 'PREVENT_TIPPING', 'SETUP_L4']],
  ['SCORE_L4', 'STOW', ['SCORE_L4', 'PREVENT_TIPPING', 'TOP', 'STOW']],
  ['STOW', 'L2', ['STOW', 'L2']],
  ['L2', 'INTAKE', ['L2', 'STOW', 'INTAKE']],
  ['INTAKE', 'SCORE_L3', ['INTAKE', 'TOP', 'SETUP_L3', 'SCORE_L3']],
  ['SCORE_L3', 'SCORE_L4', ['SCORE_L3', 'SETUP_L3', 'PREVENT_TIPPING', 'SETUP_L4', 'SCORE_L4']],
  ['L1', 'DESCORE_HIGH', ['L1', 'TOP', 'DESCORE_HIGH']],
  ['DESCORE_HIGH', 'SETUP_L4', ['DESCORE_HIGH', 'PREVENT_TIPPING', 'SETUP_L4']],
  ['STOW', 'CLIMB', ['STOW', 'CLIMB']],
  ['CLIMB', 'L1', ['CLIMB', 'L1']],
  ['STOW', 'DESCORE_LOW', ['STOW', 'TOP', 'DESCORE_LOW']],
]

let failures = 0
const fail = (message) => { failures++; console.log('FAIL', message) }

for (const [from, to, want] of ROUTES) {
  const s = simulate(from, to)
  const got = s.route.join(' > ')
  if (got !== want.join(' > ')) fail(`${from} -> ${to}: got ${got}, want ${want.join(' > ')}`)
  else if (s.current !== to) fail(`${from} -> ${to}: stopped in ${s.current}`)
  else console.log('ok  ', `${from} -> ${to}`.padEnd(30), got, `(${s.clock.toFixed(2)} s)`)
}

// Every state is reachable from STOW and settles on its own targets.
for (const to of STATES) {
  const s = simulate('STOW', to)
  if (s.current !== to) fail(`STOW -> ${to} stopped in ${s.current}`)
}

// INTAKE -> STOW holds in INTAKE, as the Worlds code does.
{
  const s = simulate('INTAKE', 'STOW', { seconds: 3 })
  if (s.current !== 'INTAKE' || holding(s) !== 'loop') fail('INTAKE -> STOW should hold in INTAKE')
  else console.log('ok  ', 'INTAKE -> STOW'.padEnd(30), 'holds in INTAKE (as written at Worlds)')
}

// TOP holds the pivot until the carriage passes 5 in.
{
  const s = createSuperstructure('STOW')
  request(s, 'TOP')
  let early = false
  for (let i = 0; i < 300; i++) {
    tick(s)
    if (s.current === 'TOP' && s.elevator.x <= 5 && s.pivot.target === 'TOP') early = true
  }
  if (early) fail('TOP moved the pivot target below 5 in')
  else console.log('ok  ', 'TOP guard'.padEnd(30), 'pivot waits for 5 in')
}

// PREVENT_TIPPING sends the carriage to 13 in while the arm is between -60 and
// 90. The carriage lags its target (on the Worlds log it was still at 26.5 in
// with the arm level), so check the target, and check that the carriage is
// lower at the top of the swing than where it started.
{
  const s = simulate('TOP', 'SETUP_L4', { seconds: 0 })
  let wrong = 0
  let atVertical = null
  for (let i = 0; i < 600; i++) {
    tick(s)
    if (s.current !== 'PREVENT_TIPPING') continue
    if (s.pivot.x > -50 && s.pivot.x < 80 && s.elevator.target !== 'INTAKE_SIDE') wrong++
    if (atVertical === null && s.pivot.x >= 85) atVertical = s.elevator.x
  }
  if (wrong) fail(`PREVENT_TIPPING aimed the carriage elsewhere for ${wrong} loops mid-swing`)
  else if (!(atVertical < ELEVATOR.TOP - 10)) fail(`carriage still at ${atVertical} in when the arm passed vertical`)
  else console.log('ok  ', 'PREVENT_TIPPING guard'.padEnd(30), `carriage down to ${atVertical.toFixed(1)} in as the arm passes vertical`)
}

// SCORE_L4 needs both pole switches.
{
  const s = simulate('STOW', 'SETUP_L4')
  if (!poleDetected(s)) fail('pole switches should close in the SETUP_L4 pose')
  request(s, 'SCORE_L4')
  // Hold the tongue tucked, as if the driver hadn't reached the branch yet.
  for (let i = 0; i < 5; i++) { s.tongue.x = 64; tick(s) }
  if (s.current !== 'SETUP_L4') fail('SCORE_L4 fired without the pole switches')
  else console.log('ok  ', 'SCORE_L4 gate'.padEnd(30), 'waits for both pole switches')
}

console.log(failures ? `${failures} failure(s)` : 'route check passed')
process.exitCode = failures ? 1 : 0

