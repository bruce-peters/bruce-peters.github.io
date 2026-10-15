// World layout, camera and the moving parts of the superstructure figure.
// Shared by scripts/build-anatomy.mjs (static art, audit) and the page (which
// rebuilds the levers, arm and lift strap every frame with the same code).
// World units are inches, z up.
import * as k from '../kit/iso-kit.mjs'
import * as G from '../kit/lathe.mjs'
import { PIVOT_ABOVE_CARRIAGE, PIVOT_LENGTH, STATES } from './model.js'

export const W = 600
export const H = 300
export const AZIMUTH = 58
export const ELEVATION = 30

const DEG = Math.PI / 180

// Bench
export const BENCH = { x: -52, y: -20, w: 114, d: 58, r: 6 }
export const BENCH_H = 6
export const FOOT_H = 4

// Lever frame: 13 levers, one per state, numbered in enum order. It is a
// desk-size frame, drawn smaller than the robot model so the mast reads.
export const FRAME = { x: -46, y: 16, w: 46, d: 14.4, r: 1 }
export const PLINTH_H = 1.4
export const CASE_TOP = 7.2
export const PLATE_Z = 8.1
export const LEVER = { pitch: 3.3, x0: FRAME.x + 3.2, pivotY: FRAME.y + 8, pivotZ: 5, length: 15.8, swing: 18 }
export const BOARD = { x: FRAME.x, y: FRAME.y - 2.8, w: FRAME.w, d: 1.7, r: 0.4, top: 18.7 }
export const leverX = (i) => LEVER.x0 + LEVER.pitch * i
export const LEVERS = STATES.length

// Mast, carriage and arm.
export const MX = 30
export const MY = -8
export const MAST_BASE = { x: MX - 12, y: MY - 8, w: 24, d: 24, r: 1.2 }
export const MAST_BASE_H = 2
export const OUTER = { half: 6, size: 2.4, top: 40 }
export const INNER = { half: 3.9, y: MY + 2.6, size: 2, height: 36 }
export const ARM_Y = MY + 9
export const AXLE_Z0 = MAST_BASE_H + PIVOT_ABOVE_CARRIAGE
export const ARM = { bar: 18.5, tip: 24.6, half: 1.1, thick: 0.6, box: [-2.6, 2.4], boxY: 2.6 }
export const TONGUE = { length: 5, half: 1.6, thick: 0.5 }

// Arm direction in the x-z plane. The robot scores L4 over its back, so the
// figure puts the reef branch on the +x side: 0° points at the lever frame,
// 90° straight up, 144° (SETUP_L4) up and out over the branch.
export const armDir = (theta) => [-Math.cos(theta * DEG), 0, Math.sin(theta * DEG)]
const armNormal = (theta) => {
  const d = armDir(theta)
  return [-d[2], 0, d[0]]
}
export const axleAt = (e) => [MX, ARM_Y, AXLE_Z0 + e]

// Servo 0 holds the tongue level over the branch in the L4 pose; servo 64
// folds it flat across the end of the effector.
export const tongueAngle = (theta, servo) => (180 - theta) - 36 - servo * (54 / 64)

const hinge = (theta, e) => G.add3(G.add3(axleAt(e), G.mul3(armDir(theta), ARM.tip)), G.mul3(armNormal(theta), ARM.box[1]))
export function tongueEnd(theta, servo, e) {
  const a = tongueAngle(theta, servo) * DEG
  return G.add3(hinge(theta, e), [Math.cos(a) * TONGUE.length, 0, Math.sin(a) * TONGUE.length])
}

// Reef branch: the tongue's pole switches land on it in the SETUP_L4 pose.
export const POST_R = 1.6
const L4_TOUCH = tongueEnd(144, 0, 31.6)
export const POST = { x: L4_TOUCH[0] + 0.5 + POST_R, y: ARM_Y, top: L4_TOUCH[2] + 4 }

// Intake hopper the arm hangs into at STOW.
export const HOPPER = { x: MX - 5.5, y: ARM_Y - 4.6, w: 11, d: 9.2, r: 0.6, z: 2, top: 12 }

export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [POST.x, POST.y, POST.top + 1],
    // The arm's highest point on any route is 92 in, plus the tongue.
    [MX + 6, ARM_Y + 3, 96],
    [MX - PIVOT_LENGTH - 3, ARM_Y, AXLE_Z0 + 13],
  ],
  W,
  H,
  { pad: 14, azimuth: AZIMUTH, elevation: ELEVATION },
)
export const V = G.viewOf(P)
export const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const Ln = (d, style) => k.lineSvg(d, style)
const Dots = (points, style) => k.dotsSvg(points, style)

// ---------- Levers ----------

export const leverAngle = (pull) => (-1 + 2 * pull) * LEVER.swing

export function leverFrame(i, pull) {
  const phi = leverAngle(pull) * DEG
  const a = [0, Math.sin(phi), Math.cos(phi)]
  const u = [1, 0, 0]
  return G.frameOf([leverX(i), LEVER.pivotY, LEVER.pivotZ], a, u, G.cross3(a, u))
}

export const BAR = [[-0.5, -0.33], [0.5, -0.33], [0.5, 0.33], [-0.5, 0.33]]

export function leverParts(i, pull) {
  const F = leverFrame(i, pull)
  const s0 = (PLATE_Z - LEVER.pivotZ) / F.a[2]
  return { F, s0, s1: 14, collar: [14, 14.7, 0.68], knob: [G.pointOf(F, 15.7, 0, 0), 1.05] }
}

// One lever: bar up out of its slot, a ferrule and a ball knob. `lit` is the
// lever being worked; it alone takes the accent.
export function leverSvg(i, pull, { lit = false, hover = false } = {}) {
  const { F, s0, s1, collar, knob } = leverParts(i, pull)
  const tone = lit || hover ? 'hi' : 'mid'
  return (
    S(G.prismOf(F, BAR, s0, s1, P), { tone, lit }) +
    S(G.disc(collar[0], collar[1], collar[2], F, P, { steps: 18 }), { tone: 'mid', lit }) +
    S(G.sphereOf(knob[0], knob[1], P, { steps: 28 }), { tone, lit })
  )
}

export const leverDepth = (i, pull) => G.dot3(leverParts(i, pull).knob[0], V)

// ---------- Arm ----------

function armFrame(theta, e) {
  const d = armDir(theta)
  return G.frameOf(axleAt(e), d, [0, 1, 0], armNormal(theta))
}

export function armParts(theta, servo, e) {
  const F = armFrame(theta, e)
  const ta = tongueAngle(theta, servo) * DEG
  const td = [Math.cos(ta), 0, Math.sin(ta)]
  const TF = G.frameOf(hinge(theta, e), td, [0, 1, 0], [-td[2], 0, td[0]])
  return { F, TF }
}

const HUB = (e) => G.frameAlong(axleAt(e), [0, 1, 0])

// The arm, effector and tongue at pivot angle theta (degrees), tongue servo
// position and carriage height e. Painted bar, hub, then effector and tongue
// in whichever order the end face calls for.
export function armSvg(theta, servo, e, { poles = false } = {}) {
  const { F, TF } = armParts(theta, servo, e)
  const out = []
  out.push(S(G.prismOf(F, [[-ARM.thick, -ARM.half], [ARM.thick, -ARM.half], [ARM.thick, ARM.half], [-ARM.thick, ARM.half]], 0, ARM.bar, P), { tone: 'hi' }))
  // Lightening slots along the bar, on the face toward the viewer.
  const face = ARM.thick + 0.01
  for (const [a, b] of [[4.2, 8.4], [10.2, 14.4]]) {
    const ring = [[a, -0.45], [b, -0.45], [b, 0.45], [a, 0.45]].map(([s, v]) => at(G.add3(G.add3(F.o, G.mul3(F.a, s)), G.add3(G.mul3(F.u, face), G.mul3(F.v, v)))))
    out.push(Ln(k.pathOf(ring, true), { tone: 'lo' }))
  }
  const hub = HUB(e)
  out.push(S(G.disc(-1.6, 1.6, 2.3, hub, P, { steps: 40 }), { tone: 'mid' }))
  out.push(Dots(G.dotsOf(hub, 1.6, 1.5, 6, P, { all: true, phase: theta * DEG }), { size: 0.4, tone: 'mid' }))

  const box = [[-ARM.boxY, ARM.box[0]], [ARM.boxY, ARM.box[0]], [ARM.boxY, ARM.box[1]], [-ARM.boxY, ARM.box[1]]]
  const effector =
    S(G.prismOf(F, box, ARM.bar - 0.6, ARM.tip, P), { tone: 'hi' }) +
    Ln(k.pathOf(ARM.box.map((v) => at(G.add3(G.add3(F.o, G.mul3(F.a, 21.6)), G.add3(G.mul3(F.u, ARM.boxY + 0.01), G.mul3(F.v, v)))))), { tone: 'faint' })
  const roller = S(G.disc(-ARM.boxY - 0.4, ARM.boxY + 0.4, 0.9, G.frameAlong(G.add3(G.add3(F.o, G.mul3(F.a, ARM.tip - 1.4)), G.mul3(F.v, ARM.box[0] - 0.2)), [0, 1, 0]), P, { steps: 24 }), { tone: 'mid' })
  const tbox = [[-TONGUE.half, 0], [TONGUE.half, 0], [TONGUE.half, TONGUE.thick], [-TONGUE.half, TONGUE.thick]]
  const tongue =
    S(G.prismOf(TF, tbox, 0, TONGUE.length, P), { tone: 'mid' }) +
    [-0.8, 0.8].map((y) => S(G.disc(TONGUE.length, TONGUE.length + 0.45, 0.32, G.frameOf(G.add3(TF.o, G.add3(G.mul3(TF.u, y), G.mul3(TF.v, TONGUE.thick / 2))), TF.a, TF.u, TF.v), P, { steps: 12 }), { tone: poles ? 'hi' : 'lo', lit: poles })).join('')
  const endFacing = G.dot3(F.a, V) > 0
  out.push(...(endFacing ? [roller, effector, tongue] : [tongue, roller, effector]))
  // Pivot CANcoder on the front end of the axle.
  out.push(S(G.disc(1.6, 2.6, 1.2, hub, P, { steps: 28 }), { tone: 'mid' }))
  out.push(Ln(G.circleOf(hub, 2.6, 0.5, P, 16), { tone: 'lo' }))
  return out.join('')
}

// ---------- Lift strap ----------
// The drum winds the strap up the back of the outer stage, over the top
// pulley and down the front to the inner stage's bottom cross-member, so the
// front run shortens as the carriage rises.
export const DRUM_Z = MAST_BASE_H + 4.2
export const PULLEY_Z = OUTER.top + 1.6
export const STRAP = { x: MX - 0.6, y: MY + 1.25, w: 1.2, d: 0.3 }
export const STRAP_FOOT = MAST_BASE_H + 6
export const strapSvg = (e) => S(k.slabOf({ ...STRAP, r: 0.1 }, STRAP_FOOT + e, Math.max(0.1, PULLEY_Z - STRAP_FOOT - e), P, 2), { tone: 'lo', crease: 'none' })

// ---------- Other fixed parts the build script places ----------
// The route display stands behind the frame and shows over its back board,
// where a signal box mounts its indicator.
export const DESCRIBER = { x: -36, y: BOARD.y - 10, w: 24, d: 10, r: 1, top: 34 }
export const SCREEN = { x0: DESCRIBER.x + 2, x1: DESCRIBER.x + 22, z0: 21, z1: 29, font: 1.85 }
export const GEARBOX = { x: MX - 19, y: MY - 6, w: 7, d: 12, r: 0.8 }
export const TROUGH_B = { x: GEARBOX.x + 0.5, y: GEARBOX.y + GEARBOX.d, w: 5, d: FRAME.y + 6 - (GEARBOX.y + GEARBOX.d), r: 0.4 }
export const TROUGH_A = { x: FRAME.x + FRAME.w + 1.1, y: FRAME.y + 1, w: TROUGH_B.x - (FRAME.x + FRAME.w + 1.1), d: 5, r: 0.4 }

