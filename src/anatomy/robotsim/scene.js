// World layout, camera and moving parts of the robot simulation figure: the
// robot's real brain on a bench, wired through its motor controllers to
// stand-ins that are the physics the sim computes. Units are about a
// centimetre, z up. Shared by the build script and the page.
import * as k from '../kit/iso-kit.mjs'
import * as G from '../kit/lathe.mjs'

export const W = 600
export const H = 300
export const AZIMUTH = 70
export const ELEVATION = 30
const DEG = Math.PI / 180

export const BENCH = { x: -166, y: -36, w: 272, d: 66, r: 8 }
export const BENCH_H = 7
export const FOOT_H = 5

// The brain: a controller box with a screen and the mode switch on top.
export const BRAIN = { x: -158, y: -26, w: 34, d: 22, r: 1.5, top: 24 }
export const SCREEN = { x0: BRAIN.x + 3, x1: BRAIN.x + BRAIN.w - 3, z0: 11, z1: 20, font: 1.9 }
export const SWITCH = { x: BRAIN.x + 9, y: BRAIN.y + 11, r: 4.2, z: BRAIN.top }
export const MODES = ['REAL', 'SIM', 'REPLAY']
export const switchAngle = (mode) => [-60, 0, 60][MODES.indexOf(mode)]
// The recorded match: a reel on a cradle on the brain, axle along y.
export const REEL = { x: BRAIN.x + BRAIN.w - 9, y: BRAIN.y + 11, z: BRAIN.top + 9.5, r: 7.5 }

// Twelve motor controllers on a tray in front of the brain: 8 swerve,
// 2 elevator, pivot, intake. (The climb's controller is the twelfth in the
// real robot; here the intake and climb share a row with the rest.)
export const TRAY = { x: BRAIN.x - 2, y: 2, w: 46, d: 18, r: 1.2 }
export const CONTROLLERS = Array.from({ length: 12 }, (_, i) => ({ x: TRAY.x + 4 + (i % 6) * 7, y: TRAY.y + 3 + Math.floor(i / 6) * 8 }))

// The bus trough along the back of the bench.
export const TROUGH = { x: BRAIN.x + BRAIN.w, y: -36, w: 0, d: 6, r: 0.5 }

// Stand-ins, left to right.
export const ELEVATOR = { x: -100, y: -12, half: 8, top: 56, travel: 32.5, base: 6 } // 1 unit per inch of carriage travel
export const PIVOT = { x: -64, y: -10, z: 32, length: 20, shaftY: 0 }
export const FLYWHEEL = { x: -32, y: -10, z: 15, r: 10 }
export const SWERVE = { x: 12, y: -4, half: 14, pad: 8 }
export const CAMERA = { x: 92, y: -10, z: 16 }
export const TAGBOARD = { x: 56, y: -10, z: 18, half: 9 }

export const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0), [ELEVATOR.x, ELEVATOR.y, ELEVATOR.top + 6], [REEL.x, REEL.y, REEL.z + REEL.r + 1], [PIVOT.x, PIVOT.y + 6, PIVOT.z + PIVOT.length + 4]],
  W,
  H,
  { pad: 12, headroom: 22, azimuth: AZIMUTH, elevation: ELEVATION },
)
export const V = G.viewOf(P)
export const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const Ln = (d, style) => k.lineSvg(d, style)
const Dots = (points, style) => k.dotsSvg(points, style)

// ---------- Elevator: a weight on a cable from a drum ----------
export const DRUM = { z: ELEVATOR.top - 4, r: 2.6 }
export const WEIGHT = { w: 10, d: 7, h: 6 }
export const weightZ = (inches) => ELEVATOR.base + Math.max(0, Math.min(ELEVATOR.travel, inches))
export function weightSvg(inches) {
  const z = weightZ(inches)
  const plan = { x: ELEVATOR.x - WEIGHT.w / 2, y: ELEVATOR.y - WEIGHT.d / 2, w: WEIGHT.w, d: WEIGHT.d, r: 0.8 }
  const top = z + WEIGHT.h
  const hook = [ELEVATOR.x, ELEVATOR.y]
  const cable = Ln(k.segment([hook[0], hook[1], top + 1.2], [hook[0], hook[1], DRUM.z - DRUM.r], P), { tone: 'mid' })
  return S(k.slabOf(plan, z, WEIGHT.h, P, 3, 0.4), { tone: 'hi', lit: true }) +
    Ln(k.sideSeam(plan, z + WEIGHT.h / 2, P, 3), { tone: 'faint' }) +
    S(k.cylinder(hook[0], hook[1], 1, top, 1.2, P, 16), { tone: 'mid' }) + cable + Dots([at([hook[0], hook[1], top + 1.2])], { size: 0.5, tone: 'hi' })
}
// A mark on the drum's front face that turns as the cable winds.
export function drumMark(inches) {
  const F = G.frameAlong([ELEVATOR.x, ELEVATOR.y + ELEVATOR.half - 0.6, DRUM.z], [0, 1, 0])
  const a = -(inches / (2 * Math.PI * DRUM.r)) * 2 * Math.PI
  const p0 = G.pointOf(F, 0.6, 0.6, a)
  const p1 = G.pointOf(F, 0.6, DRUM.r + 0.6, a)
  return Ln(k.pathOf([at(p0), at(p1)]), { tone: 'hi', free: 'end' })
}

// ---------- Pivot: a pendulum ----------
// theta in the robot code's degrees: 0 level, 90 up; the arm swings in the
// x-z plane in front of its stand.
export function pendulumSvg(theta) {
  const d = [-Math.cos(theta * DEG), 0, Math.sin(theta * DEG)]
  const o = [PIVOT.x, PIVOT.y + 4.6, PIVOT.z]
  const F = G.frameOf(o, d, [0, 1, 0], [-d[2], 0, d[0]])
  const bar = [[-0.5, -0.9], [0.5, -0.9], [0.5, 0.9], [-0.5, 0.9]]
  const bob = G.add3(o, G.mul3(d, PIVOT.length))
  return S(G.prismOf(F, bar, 0, PIVOT.length - 2.4, P), { tone: 'hi' }) +
    S(G.sphereOf(bob, 2.8, P, { steps: 28 }), { tone: 'hi' }) +
    S(G.disc(-0.8, 0.8, 2.2, G.frameAlong(o, [0, 1, 0]), P, { steps: 24 }), { tone: 'mid' })
}

// ---------- Intake flywheel ----------
export function flywheelSpokes(angle) {
  const F = G.frameAlong([FLYWHEEL.x, FLYWHEEL.y + 2.3, FLYWHEEL.z], [0, 1, 0])
  const lines = []
  for (let i = 0; i < 5; i++) {
    const a = angle + (i * 2 * Math.PI) / 5
    lines.push(k.pathOf([at(G.pointOf(F, 0, 2.2, a)), at(G.pointOf(F, 0, FLYWHEEL.r, a))]))
  }
  return Ln(lines.join(''), { tone: 'mid' })
}

// ---------- Swerve modules on floor pads ----------
export const MODULES = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sy]) => [SWERVE.x + sx * SWERVE.half, SWERVE.y + sy * (SWERVE.half - 4)])
// steer: radians the modules point (all the same while translating);
// spin: wheel roll in radians.
export function swerveSvg(steer, spin) {
  const items = []
  for (const [mx, my] of MODULES) {
    const dir = [Math.cos(steer), Math.sin(steer), 0]
    const axle = [-Math.sin(steer), Math.cos(steer), 0]
    const pad = 1.4
    const wz = pad + 3.2
    const WF = G.frameAlong([mx - axle[0] * 1.2, my - axle[1] * 1.2, wz], axle)
    const wheel = S(G.disc(0, 2.4, 3.2, WF, P, { steps: 28 }), { tone: 'mid' })
    // A roll mark on the wheel's outer face.
    const face = G.dot3(axle, V) > 0 ? 2.41 : -0.01
    const mark = Ln(k.pathOf([at(G.pointOf(WF, face, 0.6, spin)), at(G.pointOf(WF, face, 2.8, spin))]), { tone: 'hi', free: 'end' })
    // The steering housing above the wheel, with an arrow-like fin that shows where it points.
    const housing = S(k.cylinder(mx, my, 3.4, wz + 3.2, 2.6, P, 28), { tone: 'mid' })
    const fin = Ln(k.lineOnTop([mx, my], [mx + dir[0] * 3, my + dir[1] * 3], wz + 5.81, P), { tone: 'hi', free: 'end' })
    const motor = S(k.cylinder(mx, my, 1.9, wz + 5.8, 3, P, 20), { tone: 'mid' })
    items.push({ d: G.dot3([mx, my, wz], V), svg: wheel + mark + housing + motor + fin })
  }
  items.sort((a, b) => a.d - b.d)
  return items.map((item) => item.svg).join('')
}

// ---------- Match-log reel ----------
export function reelSpokes(angle) {
  const F = G.frameAlong([REEL.x, REEL.y + 2.61, REEL.z], [0, 1, 0])
  const lines = []
  for (let i = 0; i < 3; i++) {
    const a = angle + (i * 2 * Math.PI) / 3
    lines.push(k.pathOf([at(G.pointOf(F, 0, 1.6, a)), at(G.pointOf(F, 0, REEL.r - 1.6, a))]))
  }
  return Ln(lines.join(''), { tone: 'mid' })
}

export function switchPointer(angleDeg) {
  const a = angleDeg * DEG
  const tip = [SWITCH.x + Math.sin(a) * (SWITCH.r - 1), SWITCH.y + Math.cos(a) * (SWITCH.r - 1)]
  return Ln(k.lineOnTop([SWITCH.x, SWITCH.y], tip, SWITCH.z + 2.41, P), { tone: 'hi', free: 'end' })
}

void Dots
