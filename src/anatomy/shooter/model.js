// Shoot-on-the-move for the 2026 robot, ported from FRC-2026
// RobotState.java, ShootingAnglePredictor.calculateTargetShootingState()
// (the competition table, not the SIM one). Pure JS, no DOM.
//
// There is no turret: the shot's heading is where the drivebase points.

const DEG = Math.PI / 180

// Distance (m) -> launch angle (deg from horizontal), flywheel surface speed
// (m/s), time of flight (s). Tuned on the robot; linear in between, held flat
// past either end (WPILib InterpolatingTreeMap).
export const TABLE = [
  [1.3, 83, 8.5, 1.09],
  [2.0, 77, 8.4, 0.97],
  [2.5, 73, 9, 1.14],
  [3.0, 73, 9.4, 1.15],
  [3.5, 69, 9.5, 1.22],
  [4.0, 67, 10.2, 1.3],
  [4.5, 67, 10.5, 1.34],
  [5.2, 64, 10.9, 1.39],
]

export const LATENCY = 0.15 // s, the robot projects itself this far ahead
export const MAX_SCOPED_VELOCITY = 1.5 // m/s, drive speed limit while shooting
export const FILTER_TAPS = 5 // moving average on vx and vy, one sample per 20 ms loop

export function lookup(distance) {
  const first = TABLE[0]
  const last = TABLE[TABLE.length - 1]
  if (distance <= first[0]) return { angle: first[1], speed: first[2], tof: first[3] }
  if (distance >= last[0]) return { angle: last[1], speed: last[2], tof: last[3] }
  let i = 0
  while (TABLE[i + 1][0] < distance) i++
  const [d0, a0, s0, t0] = TABLE[i]
  const [d1, a1, s1, t1] = TABLE[i + 1]
  const t = (distance - d0) / (d1 - d0)
  return { angle: a0 + (a1 - a0) * t, speed: s0 + (s1 - s0) * t, tof: t0 + (t1 - t0) * t }
}

// pose [x, y] in m, velocity [vx, vy] in m/s (already filtered), hub [x, y].
// Returns everything the figure shows, in the code's own steps.
export function solve(pose, velocity, hub) {
  // 1. Project future position.
  const future = [pose[0] + velocity[0] * LATENCY, pose[1] + velocity[1] * LATENCY]
  // 2. Target vector.
  const toGoal = [hub[0] - future[0], hub[1] - future[1]]
  const distance = Math.hypot(toGoal[0], toGoal[1])
  const dir = [toGoal[0] / distance, toGoal[1] / distance]
  // 3. Baseline from the table.
  const base = lookup(distance)
  const vh = distance / base.tof
  // 4-5. Target velocity, minus the robot's ("THE MAGIC").
  const shot = [dir[0] * vh - velocity[0], dir[1] * vh - velocity[1]]
  // 6. Heading of the drivebase.
  const heading = Math.atan2(shot[1], shot[0])
  const horizontal = Math.hypot(shot[0], shot[1])
  // 7-8. Keep the tuned vertical speed, re-aim the hood for the new horizontal one.
  const vv = vh * Math.tan(base.angle * DEG)
  const hood = Math.atan2(vv, horizontal) / DEG
  // 9. Scale the flywheel by the change in exit speed.
  const staticExit = vh / Math.cos(base.angle * DEG)
  const speed = base.speed * (Math.hypot(horizontal, vv) / staticExit)
  // How far the drivebase points off the line to the hub, signed.
  let lead = (heading - Math.atan2(dir[1], dir[0])) / DEG
  lead = ((lead + 540) % 360) - 180
  return { future, distance, dir, base, vh, vv, shot, heading, horizontal, hood, speed, lead }
}

// A 5-tap moving average, sampled every 20 ms like the robot loop.
export function movingAverage(taps = FILTER_TAPS) {
  const buf = []
  return (value) => {
    buf.push(value)
    if (buf.length > taps) buf.shift()
    return buf.reduce((a, b) => a + b, 0) / buf.length
  }
}
