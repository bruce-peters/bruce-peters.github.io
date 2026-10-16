// World layout, camera and moving parts of the scouting figure: a pneumatic
// tube station. Eight scout desks along the front (red 1-3 and the red qual
// desk on the left, blue on the right) each send a capsule down a tube to the
// manager's receiver at the back, where that match's eight lamps light as the
// reports land. Units are about a centimetre, z up. Shared by the build
// script and the page.
import * as k from '../kit/iso-kit.mjs'
import * as G from '../kit/lathe.mjs'
import { ROLES, MATCH_SECONDS } from './model.js'

export const W = 600
export const H = 300
export const AZIMUTH = 54
export const ELEVATION = 30
const DEG = Math.PI / 180

export const BED = { x: -152, y: -42, w: 304, d: 84, r: 6 }
export const BED_H = 7
export const FOOT_H = 5

// ---------- Desks ----------
const XS = { red1: -138, red2: -110, red3: -82, qualRed: -54, qualBlue: 54, blue1: 82, blue2: 110, blue3: 138 }
export const DESK = { y: 8, w: 22, d: 18, top: 9 }
export const DESKS = ROLES.map((role) => {
  const x = XS[role.key]
  // The dispatch head sits on the desk's inner corner, toward the receiver.
  return { ...role, x, plan: { x: x - DESK.w / 2, y: DESK.y, w: DESK.w, d: DESK.d, r: 1 }, head: [x - Math.sign(x) * 6.5, DESK.y + 3] }
})
export const FRONT_Y = DESK.y + DESK.d
// Tally counter on a robot desk: three-digit window, keys +1 / +5 / +20.
export const COUNTER = { w: 12, d: 8, y: 14, h: 5.5 }
export const KEYS = [-3.6, 0, 3.6]
// Ranking rack on a qual desk: three cards, best to worst, left to right.
export const RACK = { w: 16, d: 5, y: 15, h: 1.5, card: [3.6, 1.2, 6.5], gap: 5 }
// Dispatch head at the back right of each desk, where the capsule goes in.
export const HEAD = { r: 2.4, top: DESK.top + 5 }

// ---------- Tubes ----------
export const TUBE_R = 1.15
export const HEADER = { y: -24, z: 30, r: 2.1, end: 146, wall: 32, flange: 1.1 }
export const COLLAR = { r: 3.1, half: 2.6, boss: 3.6 } // boss: the flat pad the desk tube lands on, from the header's axis
export const CLAMP = { r: 2.8, half: 2.2 }
export const BEND = 5
export function deskRoute(desk) {
  const [hx, hy] = desk.head
  return G.fillet([[hx, hy, HEAD.top], [hx, hy, HEADER.z], [hx, HEADER.y + COLLAR.boss, HEADER.z]], BEND, 10, { P, tube: TUBE_R })
}
// The capsule's whole trip: up the desk's tube, then along the header to
// the receiver's wall.
export function tripOf(desk) {
  const side = Math.sign(desk.x)
  const route = deskRoute(desk)
  const points = G.resample([...route, [desk.head[0], HEADER.y, HEADER.z], [side * (HEADER.wall + HEADER.flange), HEADER.y, HEADER.z]], 1)
  return { points, length: G.pathLength(points) }
}

// ---------- The manager's receiver ----------
export const RECEIVER = { x: -32, y: -40, w: 64, d: 30, r: 1.5, top: 44 }
export const RFACE = RECEIVER.y + RECEIVER.d
export const LAMPS_Z = 21
export const lampX = (i) => [-24.5, -17.5, -10.5, -3.5, 3.5, 10.5, 17.5, 24.5][i]
export const CLOCK = { x: 6, z: 33, r: 7.2 }
export const MATCH_WINDOW = { x0: -27, x1: -11, z0: 30.4, z1: 35.6 }
export const TRAY = { x: -15, y: RFACE, w: 30, d: 9, r: 0.8, z0: 3, z1: 6.5 }

export const P = k.fitProjection(
  [...k.boxCorners(BED, -BED_H - FOOT_H, 0), [RECEIVER.x, RECEIVER.y, RECEIVER.top], [RECEIVER.x + RECEIVER.w, RECEIVER.y, RECEIVER.top], [-HEADER.end, HEADER.y, HEADER.z + 4], [HEADER.end, HEADER.y, HEADER.z + 4]],
  W,
  H,
  { pad: 12, headroom: 22, azimuth: AZIMUTH, elevation: ELEVATION },
)
export const V = G.viewOf(P)
export const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)
const Ln = (d, style) => k.lineSvg(d, style)
const Dots = (points, style) => k.dotsSvg(points, style)

// ---------- Capsules ----------
function capsule(p, tangent, { lit = true, tone = 'hi' } = {}) {
  const F = G.frameAlong(p, tangent)
  return S(G.disc(-1.9, 1.9, 0.95, F, P, { steps: 18 }), { tone, lit })
}
// flights: [{ desk, s }] with s the distance along that desk's trip;
// queued: desks whose capsule waits in the dispatch head.
export function capsulesSvg(flights, queued) {
  const items = []
  for (const { trip, s } of flights) {
    const p = G.pointAlong(trip.points, s)
    const t = G.tangentAlong(trip.points, s)
    items.push({ d: G.dot3(p, V), svg: capsule(p, t) })
  }
  for (const desk of queued) {
    const p = [desk.head[0], desk.head[1], HEAD.top + 1.4]
    items.push({ d: G.dot3(p, V), svg: capsule(p, [0, 0, 1]) })
  }
  return items.sort((a, b) => a.d - b.d).map((item) => item.svg).join('')
}

// Capsules that have landed, lying in the tray side by side.
export function traySvg(count) {
  const out = []
  for (let i = 0; i < count; i++) {
    const x = TRAY.x + 3.2 + i * 3.4
    out.push(capsule([x, TRAY.y + TRAY.d / 2, TRAY.z0 + 1.6], [0, 1, 0], { lit: false }))
  }
  return out.join('')
}

// ---------- Ranking cards on a qual desk ----------
// places: for each card (0 best-dressed, 1, 2), its slot as a float 0..2.
export function rackSvg(desk, places) {
  const [w, d, h] = RACK.card
  const z0 = DESK.top + RACK.h
  const tones = ['hi', 'mid', 'lo']
  const cards = places.map((place, card) => {
    const cx = desk.x + (place - 1) * RACK.gap
    const plan = { x: cx - w / 2, y: RACK.y + RACK.d / 2 - d / 2, w, d, r: 0.2 }
    return { d: G.dot3([cx, RACK.y, z0], V), svg: S(k.slabOf(plan, z0, h, P, 1, 0.12), { tone: tones[card] }) + Dots([at([cx, plan.y + d, z0 + h - 1.2])], { size: 0.4, tone: 'hi' }) }
  })
  return cards.sort((a, b) => a.d - b.d).map((c) => c.svg).join('')
}

// ---------- Match clock hand ----------
// One turn is the 160 s match, clockwise from the top.
export const clockAngle = (t) => (90 - (t / MATCH_SECONDS) * 360) * DEG
export function clockHandSvg(t) {
  const F = G.frameOf([CLOCK.x, RFACE + 0.95, CLOCK.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const a = clockAngle(t)
  return Ln(k.pathOf([at(G.pointOf(F, 0, 0, a)), at(G.pointOf(F, 0, CLOCK.r - 1, a))]), { tone: 'hi', free: 'end' }) + Dots([at(G.pointOf(F, 0.01, 0, 0))], { size: 0.6, tone: 'hi' })
}
