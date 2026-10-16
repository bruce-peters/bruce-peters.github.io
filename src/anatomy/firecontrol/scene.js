// World layout, camera and moving parts of the fire-control computer: a
// desk-top gear-and-cam computer that solves the 2026 robot's shot on the
// move, the way the rangekeepers navies built aimed guns from a moving ship.
// Range, speed and course go in on three handwheels; the shot table is cut
// into a template that a carriage reads; a vector solver takes the robot's
// velocity off the shot; a quadrant and two dials read out the answer.
// Units are about a centimetre, z up. Shared by the build script and the page.
import * as k from '../kit/iso-kit.mjs'
import * as G from '../kit/lathe.mjs'
import { TABLE, lookup } from './model.js'

export const W = 600
export const H = 300
export const AZIMUTH = 54
export const ELEVATION = 30
const DEG = Math.PI / 180

export const BED = { x: -150, y: -38, w: 300, d: 76, r: 6 }
export const BED_H = 7
export const FOOT_H = 5

// ---------- Inputs: three handwheels on a gearbox, a counter over each ----------
export const BOX = { x: -146, y: -16, w: 40, d: 42, r: 1.5, top: 26 }
export const FACE_Y = BOX.y + BOX.d
export const WHEEL = { z: 10, r: 4.2 }
export const WHEELS = [
  { key: 'range', x: -136 },
  { key: 'speed', x: -126 },
  { key: 'course', x: -116 },
]
export const COUNTER = { z0: 16.4, z1: 20.2, w: 8, font: 2 }
// Turns of each wheel: one per metre of range, one per 0.5 m/s, one per
// full course.
export const wheelAngle = { range: (m) => m * 2 * Math.PI, speed: (v) => (v / 0.5) * 2 * Math.PI, course: (deg) => deg * DEG }

// ---------- The shot table, cut into a template ----------
// Range runs along x at 16 units a metre, so whole metres land on the rail's
// major ticks. The carriage reads the template with two followers 5 units
// either side of its centre: a roller on the top edge (launch angle) and a
// pin in the slot (horizontal speed, distance over time of flight).
export const RANGE_X = (m) => -96 + 16 * m
export const RANGE_LIMITS = [TABLE[0][0], TABLE[TABLE.length - 1][0]]
export const CAM = { x0: -86, x1: -2, y0: -6, y1: -3, base: 2, follow: 5 }
export const RAIL = { x: -88, y: 2, w: 86, d: 8, r: 0.6, top: 2.4 }
export const SCREW = { y: 14, z: 4, r: 1.3, x0: BOX.x + BOX.w, x1: 0 }
const rangeAt = (x) => (x + 96) / 16
// Horizontal speed from the table: distance over time of flight.
export const vhAt = (m) => m / lookup(m).tof
export const edgeZ = (x) => 16 + (lookup(rangeAt(x + CAM.follow)).angle - 60) * 0.55
export const slotZ = (x) => 4.6 + vhAt(rangeAt(x - CAM.follow)) * 2.4
export const SLOT_HALF = 1.2
export const CARRIAGE = { half: 7, arm: [33, 35.4], rod: 41 }

// ---------- Vector solver on a raised table ----------
// Origin O; the hub direction is +x. The target bar runs out v_h (m/s) along
// +x; a turntable at its tip carries the robot's velocity, reversed; the
// slotted arm from O through the pin is the shot's heading, and its tip reads
// the lead on the engraved arc.
export const TABLE_PLAN = { x: 4, y: -33, w: 46, d: 66, r: 2 }
export const TABLE_Z = [11.5, 13.5]
export const O = [8, 0, TABLE_Z[1]]
export const KS = 7 // units per m/s
export const ARC = { r: 38, span: 55 }
export const ARM = { length: 41, half: 1.3, z: [17.6, 18.4] }

// ---------- Hood quadrant, a vertical plate facing the reader ----------
export const QUAD = { x: 60, y: 9, w: 38, d: 3, r: 0.4, z0: 2, z1: 48 }
export const QFACE = QUAD.y + QUAD.d
export const QPIVOT = [64, 8]
export const KH = 3.4 // units per m/s on the quadrant
export const QARC = { r: 38, from: 50, to: 92 }

// ---------- Readout tower: lead repeater, flywheel tach, fire lamp ----------
export const TOWER = { x: 106, y: -8, w: 38, d: 22, r: 1.5, top: 30 }
export const TFACE = TOWER.y + TOWER.d
export const LEAD_DIAL = { x: 115, z: 19, r: 6.5, span: 60 } // ±60° of lead over ±120° of dial
export const FLY_DIAL = { x: 134, z: 19, r: 6.5, from: 8, to: 12 } // m/s over 270°
export const LAMP = { x: 124.5, z: 7 }

export const P = k.fitProjection(
  [...k.boxCorners(BED, -BED_H - FOOT_H, 0), [RANGE_X(5.2), -6, CARRIAGE.rod + 1], [RANGE_X(1.3), -6, CARRIAGE.rod + 1], [QUAD.x, QFACE, QUAD.z1], [BOX.x, BOX.y, BOX.top]],
  W,
  H,
  { pad: 12, headroom: 22, azimuth: AZIMUTH, elevation: ELEVATION },
)
export const V = G.viewOf(P)
export const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const Ln = (d, style) => k.lineSvg(d, style)
const Dots = (points, style) => k.dotsSvg(points, style)
const rect = (hx, hy) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]]
const up = [0, 0, 1]

// A list of { d, svg } painted back to front.
function painted(items) {
  return items.sort((a, b) => a.d - b.d).map((item) => item.svg).join('')
}
const depth = (p) => G.dot3(p, V)

// ---------- Handwheel spokes and crank knob ----------
export function wheelSvg(x, angle) {
  const F = G.frameOf([x, FACE_Y + 1.8, WHEEL.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const spokes = [0, 1, 2].map((i) => k.pathOf([at(G.pointOf(F, 0.01, 1.3, angle + (i * 2 * Math.PI) / 3)), at(G.pointOf(F, 0.01, 3.2, angle + (i * 2 * Math.PI) / 3))])).join('')
  const knob = G.pointOf(F, 0, 3.05, angle)
  const KF = G.frameOf(knob, [0, 1, 0], [1, 0, 0], [0, 0, 1])
  return Ln(spokes, { tone: 'lo' }) + S(G.disc(0, 2.6, 0.75, KF, P, { steps: 18 }), { tone: 'hi' }) + Dots([at(G.pointOf(F, 0.02, 0, 0))], { size: 0.5, tone: 'hi' })
}

// ---------- The carriage and its two followers ----------
export function carriageSvg(range) {
  const xc = RANGE_X(range)
  const xa = xc - CAM.follow
  const xv = xc + CAM.follow
  const za = edgeZ(xa)
  const zv = slotZ(xv)
  const ya = (CAM.y0 + CAM.y1) / 2
  const yv = 0.4
  const items = []
  const slab = (plan, z0, z1, tone = 'mid', bevel = 0.2) => S(k.slabOf(plan, z0, z1 - z0, P, 2, bevel), { tone })
  // Body on the rail, round the lead screw (the nut is inside it).
  const body = { x: xc - CARRIAGE.half, y: 1.5, w: CARRIAGE.half * 2, d: 16.5, r: 0.8 }
  items.push({ d: depth([xc, 10, 5]), svg: slab(body, RAIL.top, 8.4) + Ln(k.sideSeam(body, 6.2, P, 2), { tone: 'faint' }) + Dots(k.corners(body, 1.4).map(([x, y]) => at([x, y, 8.4])), { size: 0.4 }) })
  // Post and the arm across the template.
  const post = { x: xc - 1.2, y: 2, w: 2.4, d: 2.4, r: 0.2 }
  items.push({ d: depth([xc, 3.2, 26]), svg: slab(post, 8.4, CARRIAGE.arm[0], 'mid', 0) })
  const arm = { x: xc - 7, y: -6.5, w: 14, d: 11, r: 0.6 }
  const bushings = [[xa, ya], [xv, yv]].map(([x, y]) => S(k.cylinder(x, y, 1.3, CARRIAGE.arm[1], 1.2, P, 18), { tone: 'mid' })).join('')
  // Rods: angle follower behind, speed follower in front; each sorts on its own.
  const AF = G.frameOf([xa, CAM.y0 - 0.2, za + 1.3], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const roller = S(G.disc(0, CAM.y1 - CAM.y0 + 0.4, 1.3, AF, P, { steps: 22 }), { tone: 'hi' })
  const rodA = S(k.cylinder(xa, ya, 0.7, za + 1.3, CARRIAGE.rod - za - 1.3, P, 16), { tone: 'hi' })
  const PF = G.frameOf([xv, CAM.y0 + 1.2, zv], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const pin = S(G.disc(0, yv - CAM.y0 - 1.2, 0.9, PF, P, { steps: 18 }), { tone: 'hi' })
  const rodV = S(k.cylinder(xv, yv, 0.7, zv - 0.9, CARRIAGE.rod - zv + 0.9, P, 16), { tone: 'hi' })
  items.push({ d: depth([xa, ya, za + 6]), svg: roller + rodA })
  items.push({ d: depth([xv, yv, zv + 6]), svg: pin + rodV })
  // The arm last: the rods pass up through it.
  items.push({ d: 1e9, svg: slab(arm, CARRIAGE.arm[0], CARRIAGE.arm[1]) + bushings + Dots([at([xa, ya, CARRIAGE.arm[1] + 1.2]), at([xv, yv, CARRIAGE.arm[1] + 1.2])], { size: 0.45, tone: 'hi' }) })
  return painted(items)
}
// The rod tops above the arm, drawn after it.
export function rodTopsSvg(range) {
  const xc = RANGE_X(range)
  return [[xc - CAM.follow, (CAM.y0 + CAM.y1) / 2], [xc + CAM.follow, 0.4]]
    .map(([x, y]) => S(k.cylinder(x, y, 0.7, CARRIAGE.arm[1] + 1.2, CARRIAGE.rod - CARRIAGE.arm[1] - 1.2, P, 16), { tone: 'hi' }))
    .join('')
}

// ---------- Vector solver ----------
// vh: target speed along the hub line (m/s); away: the robot's velocity
// reversed, in the hub frame [x along the line, y across it] (m/s).
export function solverSvg(vh, away, course) {
  const T = [O[0] + vh * KS, O[1], O[2]]
  const S0 = [T[0] + away[0] * KS, T[1] + away[1] * KS]
  const lead = Math.atan2(S0[1] - O[1], S0[0] - O[0])
  const items = []
  const flat = (F, poly, s0, s1, tone, lit = false) => S(G.prismOf(F, poly, s0, s1, P), { tone, lit })
  // Target block on the centre rail.
  const TF = G.frameOf([T[0], T[1], 14.6], up, [1, 0, 0], [0, 1, 0])
  items.push(flat(TF, rect(2.6, 1.9), 0, 1.4, 'mid'))
  // Turntable and the guide for the reversed velocity, pointing along `course`.
  const DF = G.frameOf([T[0], T[1], 16], up, [1, 0, 0], [0, 1, 0])
  items.push(S(G.disc(0, 0.6, 3.4, DF, P, { steps: 32 }), { tone: 'mid' }))
  const c = Math.cos(course)
  const s = Math.sin(course)
  const GF = G.frameOf([T[0], T[1], 16.6], up, [c, s, 0], [-s, c, 0])
  const guide = [[-1, -0.8], [12, -0.8], [12, 0.8], [-1, 0.8]]
  items.push(flat(GF, guide, 0, 0.8, 'hi') + Ln(k.pathOf([at([T[0] + c * 1.5, T[1] + s * 1.5, 17.41]), at([T[0] + c * 11, T[1] + s * 11, 17.41])]), { tone: 'lo', free: 'both' }))
  // The slider at the pin.
  const SF = G.frameOf([S0[0], S0[1], 16.6], up, [c, s, 0], [-s, c, 0])
  items.push(flat(SF, rect(1.4, 1.3), 0, 0.9, 'mid'))
  // The slotted arm, lit: the shot's heading.
  const ca = Math.cos(lead)
  const sa = Math.sin(lead)
  const AF = G.frameOf([O[0], O[1], ARM.z[0]], up, [ca, sa, 0], [-sa, ca, 0])
  const outline = [[-2.2, -ARM.half], [ARM.length - 2, -ARM.half], [ARM.length, 0], [ARM.length - 2, ARM.half], [-2.2, ARM.half]]
  const slot = [[4, -0.5], [ARM.length - 5, -0.5], [ARM.length - 5, 0.5], [4, 0.5]].map(([u, v]) => at([O[0] + ca * u - sa * v, O[1] + sa * u + ca * v, ARM.z[1] + 0.01]))
  items.push(flat(AF, outline, 0, ARM.z[1] - ARM.z[0], 'hi', true) + `<path class="an-void" d="${k.pathOf(slot, true)}"/>`)
  // Pin through the slot, and the pivot cap on top.
  items.push(S(k.cylinder(S0[0], S0[1], 0.8, 17.5, 2.1, P, 16), { tone: 'hi' }))
  items.push(S(k.cylinder(O[0], O[1], 1.4, ARM.z[1], 0.6, P, 20), { tone: 'mid' }) + Dots([at([O[0], O[1], ARM.z[1] + 0.6])], { size: 0.45, tone: 'hi' }))
  return items.join('')
}

// ---------- Hood quadrant ----------
// horizontal, vertical: the shot's speeds (m/s); hood: degrees from level.
export function quadrantSvg(horizontal, vertical, hood) {
  const [qx, qz] = QPIVOT
  const px = qx + horizontal * KH
  const pz = qz + vertical * KH
  const F = (y) => G.frameOf([0, y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const prism = (poly, y0, y1, tone) => S(G.prismOf(F(0), poly, y0, y1, P), { tone })
  const bar = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
  const out = []
  // Vertical slide (horizontal speed) and horizontal slide (vertical speed).
  out.push(prism(bar(px - 0.8, 5.6, px + 0.8, 45), QFACE, QFACE + 0.6, 'mid'))
  out.push(prism(bar(QUAD.x + 3.4, pz - 0.8, QUAD.x + 34, pz + 0.8), QFACE + 0.6, QFACE + 1.2, 'mid'))
  // The arm through the crossing, from the pivot.
  const c = Math.cos(hood * DEG)
  const s = Math.sin(hood * DEG)
  const len = QARC.r + 1.4
  const arm = [[-1.6, -1], [len - 1.6, -0.5], [len, 0], [len - 1.6, 0.5], [-1.6, 1]].map(([u, v]) => [qx + c * u - s * v, qz + s * u + c * v])
  out.push(prism(arm, QFACE + 1.2, QFACE + 1.9, 'hi'))
  out.push(S(G.disc(QFACE, QFACE + 2.4, 0.8, G.frameOf([px, 0, pz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P, { steps: 16 }), { tone: 'hi' }))
  out.push(S(G.disc(0, 2.6, 2, G.frameOf([qx, QFACE, qz], [0, 1, 0], [1, 0, 0], [0, 0, 1]), P, { steps: 24 }), { tone: 'mid' }) + Dots([at([qx, QFACE + 2.61, qz])], { size: 0.5, tone: 'hi' }))
  return out.join('')
}

// ---------- Dial needles ----------
const dialFrame = (dial) => G.frameOf([dial.x, TFACE + 0.9, dial.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
export const leadDialAngle = (lead) => (90 - (Math.max(-LEAD_DIAL.span, Math.min(LEAD_DIAL.span, lead)) / LEAD_DIAL.span) * 120) * DEG
export const flyDialAngle = (speed) => (225 - ((Math.max(FLY_DIAL.from, Math.min(FLY_DIAL.to, speed)) - FLY_DIAL.from) / (FLY_DIAL.to - FLY_DIAL.from)) * 270) * DEG
function needle(dial, angle, length, tone, s = 0.02) {
  const F = dialFrame(dial)
  return Ln(k.pathOf([at(G.pointOf(F, s, 0, angle)), at(G.pointOf(F, s, length, angle))]), { tone, free: 'end' })
}
export function needlesSvg(lead, heading, speed) {
  const F = (d) => dialFrame(d)
  return needle(LEAD_DIAL, leadDialAngle(heading), LEAD_DIAL.r - 1.6, 'mid', 0.02) + needle(LEAD_DIAL, leadDialAngle(lead), LEAD_DIAL.r - 0.8, 'hi', 0.04) +
    Dots([at(G.pointOf(F(LEAD_DIAL), 0.05, 0, 0))], { size: 0.55, tone: 'hi' }) +
    needle(FLY_DIAL, flyDialAngle(speed), FLY_DIAL.r - 0.8, 'hi', 0.04) + Dots([at(G.pointOf(F(FLY_DIAL), 0.05, 0, 0))], { size: 0.55, tone: 'hi' })
}
export { dialFrame }
