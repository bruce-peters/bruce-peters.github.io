// World layout, camera and moving parts of the 2026 shoot-on-the-move figure.
// World units are centimetres on a scale field, z up. Shared by the build
// script and the page.
import * as k from '../kit/iso-kit.mjs'
import * as G from '../kit/lathe.mjs'
import { lookup } from './model.js'

export const W = 600
export const H = 300
export const AZIMUTH = 50
export const ELEVATION = 28
const DEG = Math.PI / 180

export const BASE = { x: -232, y: -135, w: 497, d: 262, r: 12 }
export const BASE_H = 9
export const FOOT_H = 6
export const CARPET_H = 2

// The hub: a hex tower with a funnel whose opening is 1.83 m up, 0.56 m
// across in radius (the game's dimensions, as in the team's fuel sim).
export const HUB = { x: 175, y: -55, r: 60, body: 150, entry: 183, mouth: 56 }

// The robot drives a straight line across the front of the field.
export const PATH = { y: 80, from: -176, to: 100 }
export const ROBOT = { half: 38, bumper: 7, bumperZ: [3, 16], frameZ: [8, 12] }
export const SHOOTER = { x: 6, half: 15, flywheelR: 5.1, flywheelZ: 44, ballR: 7.5 }
// The ball rides over the flywheel and leaves where the wheel's tangent is the
// launch angle: 90° + angle round the wheel from straight ahead.
const exitOffset = (hood) => {
  const phi = (90 + hood) * DEG
  const r = SHOOTER.flywheelR + SHOOTER.ballR
  return [SHOOTER.x + Math.cos(phi) * r, SHOOTER.flywheelZ + Math.sin(phi) * r]
}
export const EXIT_Z = exitOffset(73)[1]

// A shot's path in the field frame: straight over the floor from the exit
// to the hub, leaving at the table's launch angle and dropping into the mouth
// after the table's time of flight.
export function arcOf(exit, distanceM) {
  const base = lookup(distanceM)
  const dx = HUB.x - exit[0]
  const dy = HUB.y - exit[1]
  const d = Math.hypot(dx, dy)
  const slope = Math.tan(base.angle * DEG)
  const c = (exit[2] + slope * d - HUB.entry) / (d * d)
  return {
    tof: base.tof,
    at: (t) => {
      const u = Math.min(1, Math.max(0, t / base.tof))
      const s = u * d
      return [exit[0] + dx * u, exit[1] + dy * u, exit[2] + slope * s - c * s * s]
    },
    apex: exit[2] + (slope * slope) / (4 * c),
  }
}

// Highest arc over the whole path, for the camera fit.
function highestArc() {
  let top = HUB.entry
  for (let x = PATH.from; x <= PATH.to; x += 10) {
    const d = Math.hypot(HUB.x - x, HUB.y - PATH.y) / 100
    top = Math.max(top, arcOf([x, PATH.y, EXIT_Z], d).apex)
  }
  return top
}
export const ARC_TOP = highestArc()

export const P = k.fitProjection(
  [
    ...k.boxCorners(BASE, -BASE_H - FOOT_H, 0),
    [HUB.x, HUB.y, HUB.entry + 8],
    [(PATH.from + HUB.x) / 2, (PATH.y + HUB.y) / 2, ARC_TOP + 10],
    [PATH.from + 60, PATH.y, ARC_TOP * 0.7],
  ],
  W,
  H,
  { pad: 12, azimuth: AZIMUTH, elevation: ELEVATION },
)
export const V = G.viewOf(P)
export const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const Ln = (d, style) => k.lineSvg(d, style)
const Dots = (points, style) => k.dotsSvg(points, style)

// ---------- Robot ----------
// heading in radians (where the shooter points), wheelYaw the swerve modules'
// steering (they point where the robot is going), hood the launch angle in
// degrees relative to the robot, spin the flywheel phase.
export function robotSvg({ x, y, heading, wheelYaw, hood, spin = 0, firing = false }) {
  const c = Math.cos(heading)
  const s = Math.sin(heading)
  const local = (lx, ly, z) => [x + lx * c - ly * s, y + lx * s + ly * c, z]
  const up = [0, 0, 1]
  const fwd = [c, s, 0]
  const side = [-s, c, 0]
  const F = (lx, ly, z = 0) => G.frameOf(local(lx, ly, z), up, fwd, side)
  const rect = (hx, hy) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]]
  const items = []
  const push = (centre, svg) => items.push({ d: G.dot3(centre, V), svg })
  const R = ROBOT

  // Swerve modules, steered toward the direction of travel.
  const wc = Math.cos(wheelYaw)
  const ws = Math.sin(wheelYaw)
  for (const [mx, my] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const p = local(mx * (R.half - 9), my * (R.half - 9), 0)
    const WF = G.frameAlong([p[0], p[1], 5], [-ws, wc, 0])
    push([p[0], p[1], 5], S(G.disc(-1.8, 1.8, 5, WF, P, { steps: 24 }), { tone: 'lo' }))
  }
  // Frame rails under the bellypan.
  push(local(0, 0, 9), S(G.prismOf(F(0, 0, R.frameZ[0]), rect(R.half - 2, R.half - 2), 0, R.frameZ[1] - R.frameZ[0], P), { tone: 'mid' }) +
    Ln(k.pathOf(rect(R.half - 7, R.half - 7).map(([u, v]) => at(local(u, v, R.frameZ[1]))), true), { tone: 'faint' }))
  // Bumpers, one per side, so each sorts on its own.
  const bz = R.bumperZ
  const b = R.bumper
  for (const [cx, cy, hx, hy] of [[R.half - b / 2, 0, b / 2, R.half], [-(R.half - b / 2), 0, b / 2, R.half], [0, R.half - b / 2, R.half - b, b / 2], [0, -(R.half - b / 2), R.half - b, b / 2]]) {
    const p = local(cx, cy, bz[0])
    push(local(cx, cy, (bz[0] + bz[1]) / 2), S(G.prismOf(F(cx, cy, bz[0]), rect(hx, hy), 0, bz[1] - bz[0], P), { tone: 'mid' }))
    void p
  }
  // Swerve module covers at the corners and the battery between them.
  for (const [mx, my] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const cx = mx * (R.half - 9)
    const cy = my * (R.half - 9)
    push(local(cx, cy, R.frameZ[1] + 2), S(G.prismOf(F(cx, cy, R.frameZ[1]), rect(6.5, 6.5), 0, 4, P), { tone: 'mid' }) +
      Ln(G.circleOf(G.frameOf(local(cx, cy, R.frameZ[1] + 4.01), up, fwd, side), 0, 3.2, P, 20), { tone: 'lo' }))
  }
  push(local(-6, -27, R.frameZ[1] + 5), S(G.prismOf(F(-6, -27, R.frameZ[1]), rect(9, 5), 0, 9, P), { tone: 'lo' }))
  // Hopper of fuel at the back.
  push(local(-27, 0, 23), S(G.prismOf(F(-27, 0, R.frameZ[1]), rect(8.5, 26), 0, 22, P), { tone: 'mid' }) +
    Ln(k.pathOf(rect(7, 24.5).map(([u, v]) => at(local(-27 + u, v, R.frameZ[1] + 22))), true), { tone: 'lo' }))
  for (const by of [-14, 1, 15]) push(local(-27, by, R.frameZ[1] + 22 + 3), S(G.sphereOf(local(-27, by, R.frameZ[1] + 22 + 3), SHOOTER.ballR, P, { steps: 28 }), { tone: 'mid' }))
  // Shooter: side plates, flywheel, hood. The hood's exit points along the
  // launch angle (90° minus the hood motor's angle in the code).
  const sx = SHOOTER.x
  const fz = SHOOTER.flywheelZ
  for (const sy of [-1, 1]) {
    const plate = [[-17, R.frameZ[1]], [16, R.frameZ[1]], [16, fz + 6], [4, fz + 22], [-17, fz + 14]]
    const PF = G.frameOf(local(sx, sy * (SHOOTER.half + 1), 0), side, fwd, up)
    push(local(sx + 2, sy * (SHOOTER.half + 1), fz / 2), S(G.prismOf(PF, plate, -1, 1, P), { tone: 'mid' }))
  }
  const FW = G.frameOf(local(sx, 0, fz), side, fwd, up)
  push(local(sx, 0, fz), S(G.disc(-SHOOTER.half, SHOOTER.half, SHOOTER.flywheelR, FW, P, { steps: 28 }), { tone: 'hi' }) +
    Ln(G.arcOf(FW, SHOOTER.half, SHOOTER.flywheelR * 0.6, P, { least: -1 }), { tone: 'lo' }) +
    Dots(G.dotsOf(FW, SHOOTER.half, SHOOTER.flywheelR * 0.6, 3, P, { phase: spin, all: true }), { size: 0.45, tone: 'hi' }))
  // Hood: an arc band over the flywheel, its exit tangent at the launch angle.
  const exitAngle = (90 + hood) * DEG
  const inner = SHOOTER.flywheelR + 2 * SHOOTER.ballR + 0.6
  const band = []
  for (let i = 0; i <= 8; i++) band.push([Math.cos(exitAngle + i * 0.11) * inner, Math.sin(exitAngle + i * 0.11) * inner])
  for (let i = 8; i >= 0; i--) band.push([Math.cos(exitAngle + i * 0.11) * (inner + 1.6), Math.sin(exitAngle + i * 0.11) * (inner + 1.6)])
  const HF = G.frameOf(local(sx, 0, fz), side, fwd, up)
  const hoodPaths = G.prismOf(HF, convexBand(band), -SHOOTER.half, SHOOTER.half, P)
  push(local(sx + 8, 0, fz + 18), S(hoodPaths, { tone: 'hi', lit: firing }))
  items.sort((p, q) => p.d - q.d)
  return items.map((item) => item.svg).join('')
}

// prismOf wants a convex polygon; a thin arc band is close to one, so draw
// it as the hull of its outer arc and its chord.
function convexBand(points) {
  return G.hullOf(points)
}

export const robotDepth = (x, y) => G.dot3([x, y, 30], V)

export function ballSvg(p, { lit = true } = {}) {
  return S(G.sphereOf(p, SHOOTER.ballR, P, { steps: 28 }), { tone: 'hi', lit })
}

// Where the ball leaves the hood, in the field frame.
export function exitPoint(x, y, heading, hood) {
  const [ahead, z] = exitOffset(hood)
  return [x + Math.cos(heading) * ahead, y + Math.sin(heading) * ahead, z]
}

// The shot's path as a dotted trail, from the hood to the hub's mouth.
export function trailOf(arc, steps = 28) {
  const pts = []
  for (let i = 0; i <= steps; i++) pts.push(at(arc.at((i / steps) * arc.tof)))
  return k.pathOf(pts)
}
