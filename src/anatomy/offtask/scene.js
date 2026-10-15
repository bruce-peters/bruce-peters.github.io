// World layout, camera and moving parts of the off-task detection figure:
// one feeder of one-second clips, two conveyor lines. The short line at the
// back runs every clip through one pretrained image model and a small head;
// the long line at the front runs it through five sensor stations, a
// 96-feature manifold and a classifier. Each line ends at a gauge. Units are
// about a centimetre, z up.
import * as k from '../kit/iso-kit.mjs'
import * as G from '../kit/lathe.mjs'
import { SCALE } from './model.js'

export const W = 600
export const H = 300
export const AZIMUTH = 62
export const ELEVATION = 36
const DEG = Math.PI / 180

export const BENCH = { x: -150, y: -58, w: 300, d: 112, r: 8 }
export const BENCH_H = 7
export const FOOT_H = 5

// Conveyors: a belt on legs between two end rollers.
export const BELT = { from: -106, to: 96, half: 5, z: 9, t: 2.4 }
export const LINES = { back: -28, front: 22 }
export const TOKEN = { w: 7, d: 7, h: 1.2 }

// Stations are bridges over the belt: two legs outside it and a head on top.
export const LEG_Z = 17 // underside of a bridge head
export const STATIONS = {
  back: [
    { key: 'model', x: -50, w: 34, h: 15 },
    { key: 'head', x: 8, w: 12, h: 8 },
  ],
  front: [
    { key: 'gaze', x: -82, w: 14, h: 8 },
    { key: 'headpose', x: -58, w: 14, h: 8 },
    { key: 'pose', x: -34, w: 14, h: 8 },
    { key: 'objects', x: -10, w: 14, h: 8 },
    { key: 'speech', x: 14, w: 14, h: 8 },
    { key: 'features', x: 40, w: 18, h: 10 },
    { key: 'classifier', x: 68, w: 14, h: 9 },
  ],
}

// Gauges at the end of each line; the back one stands taller so it shows.
export const GAUGE_X = 118
export const GAUGES = { back: { y: LINES.back, z: 30 }, front: { y: LINES.front, z: 22 } }
export const GAUGE_R = 11
export const SWEEP = [-150, -30] // needle angle at the scale's ends (face plane, 0 = right, -90 = up)

export const FEEDER = { x: -136, y: LINES.back - 9, w: 22, d: LINES.front - LINES.back + 18, r: 1.5, top: 20 }
export const SWITCH = { x: 100, y: 42, r: 6 }
export const SWITCH_STOPS = 6

export const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [GAUGE_X, GAUGES.back.y, GAUGES.back.z + GAUGE_R + 2],
    [STATIONS.back[0].x, LINES.back, LEG_Z + STATIONS.back[0].h + 2],
    [FEEDER.x, FEEDER.y, FEEDER.top + 8],
  ],
  W,
  H,
  { pad: 12, headroom: 22, azimuth: AZIMUTH, elevation: ELEVATION },
)
export const V = G.viewOf(P)
export const at = (p) => k.iso(p, P)
const S = (paths, style) => k.solidSvg(paths, style)

// A clip on the belt: a small card with a frame on its face.
export function tokenSvg(x, lineY, { lit = false } = {}) {
  const plan = { x: x - TOKEN.w / 2, y: lineY - TOKEN.d / 2, w: TOKEN.w, d: TOKEN.d, r: 0.5 }
  const z = BELT.z
  return S(k.slabOf(plan, z, TOKEN.h, P, 2, 0.2), { tone: 'hi', lit }) +
    k.lineSvg(k.planOutline(k.insetPlan(plan, 1.2), z + TOKEN.h, P, 2), { tone: 'lo' })
}

// ---------- Gauges ----------
export const needleAngle = (value) => {
  const t = (value - SCALE[0]) / (SCALE[1] - SCALE[0])
  return SWEEP[0] + (SWEEP[1] - SWEEP[0]) * Math.max(0, Math.min(1, t))
}
export function needlePath(angleDeg, length = GAUGE_R - 3) {
  const a = angleDeg * DEG
  return `M${(-Math.cos(a) * 1.8).toFixed(2)} ${(-Math.sin(a) * 1.8).toFixed(2)}L${(Math.cos(a) * length).toFixed(2)} ${(Math.sin(a) * length).toFixed(2)}`
}
export const gaugeFace = (line) => GAUGES[line].y + 4.6 // the dial's face plane, y

// ---------- Lesson switch ----------
export const switchAngle = (stop) => -150 + (stop * 300) / (SWITCH_STOPS - 1)
export function switchPointer(angleDeg) {
  const a = angleDeg * DEG
  const tip = [SWITCH.x + Math.sin(a) * (SWITCH.r - 1.4), SWITCH.y - Math.cos(a) * (SWITCH.r - 1.4)]
  return k.lineSvg(k.lineOnTop([SWITCH.x, SWITCH.y], tip, 3.6 + 0.01, P), { tone: 'hi', free: 'end' })
}
