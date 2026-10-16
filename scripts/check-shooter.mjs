// Checks the shooter model against values worked out by hand from
// RobotState.java's ShootingAnglePredictor at d = 3.0 m.
// Run: node scripts/check-shooter.mjs
import { solve, lookup } from '../src/anatomy/firecontrol/model.js'

let failures = 0
const near = (got, want, tol, label) => {
  if (Math.abs(got - want) > tol) {
    failures++
    console.log('FAIL', label, 'got', got.toFixed(3), 'want', want)
  } else console.log('ok  ', label.padEnd(34), got.toFixed(3))
}

// Hub 3 m straight ahead of the future position along +x.
const hub = [3, 0]
{
  const s = solve([0, 0], [0, 0], hub)
  near(s.distance, 3, 1e-9, 'still: distance')
  near(s.lead, 0, 1e-9, 'still: lead')
  near(s.hood, 73, 1e-9, 'still: hood')
  near(s.speed, 9.4, 1e-9, 'still: speed')
  near(s.vh, 2.609, 0.001, 'still: v_h')
  near(s.vv, 8.533, 0.001, 'still: v_v')
}
// 1.5 m/s sideways. Start so the future position is at the origin.
{
  const s = solve([0, -1.5 * 0.15], [0, 1.5], hub)
  near(Math.abs(s.lead), 29.9, 0.05, 'sideways: |lead|')
  near(s.hood, 70.6, 0.05, 'sideways: hood')
  near(s.speed, 9.53, 0.005, 'sideways: speed')
}
{
  const s = solve([-1.5 * 0.15, 0], [1.5, 0], hub)
  near(s.hood, 82.6, 0.05, 'toward: hood')
  near(s.speed, 9.07, 0.006, 'toward: speed')
}
{
  const s = solve([1.5 * 0.15, 0], [-1.5, 0], hub)
  near(s.hood, 64.3, 0.05, 'away: hood')
  near(s.speed, 9.98, 0.005, 'away: speed')
}
near(lookup(1.0).angle, 83, 0, 'table holds below 1.3 m')
near(lookup(6).speed, 10.9, 0, 'table holds past 5.2 m')
near(lookup(2.25).tof, (0.97 + 1.14) / 2, 1e-9, 'table interpolates')

console.log(failures ? `${failures} failure(s)` : 'shooter check passed')
process.exitCode = failures ? 1 : 0
