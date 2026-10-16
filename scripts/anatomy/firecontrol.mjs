// The 2026 shoot-on-the-move figure: a fire-control computer on a bed. Three
// handwheels set range, speed and course; a carriage reads the shot table off
// a template; a vector solver takes the robot's velocity off the shot; a hood
// quadrant and two dials show the answer. The carriage, the solver's moving
// parts, the quadrant's slides and arm, the wheels and the needles move, so
// they are slots; the page draws them with src/anatomy/firecontrol/scene.js.
import * as k from '../../src/anatomy/kit/iso-kit.mjs'
import * as G from '../../src/anatomy/kit/lathe.mjs'
import * as A from '../../src/anatomy/kit/audit.mjs'
import { workshop, finish } from './common.mjs'
import {
  W, H, P, at, BED, BED_H, FOOT_H, BOX, FACE_Y, WHEEL, WHEELS, COUNTER, wheelAngle, RANGE_X, CAM, RAIL, SCREW, edgeZ, slotZ, SLOT_HALF,
  CARRIAGE, TABLE_PLAN, TABLE_Z, O, KS, ARC, QUAD, QFACE, QPIVOT, QARC, TOWER, TFACE, LEAD_DIAL, FLY_DIAL, LAMP, dialFrame, leadDialAngle,
  flyDialAngle, wheelSvg, carriageSvg, rodTopsSvg, solverSvg, quadrantSvg, needlesSvg,
} from '../../src/anatomy/firecontrol/scene.js'
import { TABLE, solve } from '../../src/anatomy/firecontrol/model.js'

const { R, S, Ln, Dots, put, box, ringScrews, facePlane } = workshop(P)
const DEG = Math.PI / 180
const ARM_BASE = 17.6 // underside of the solver's arm
const along = (x, y, z, axis) => G.frameOf([x, y, z], axis, axis[0] ? [0, 1, 0] : [1, 0, 0], [0, 0, 1])

// ---------- Bed ----------
const prefix = [`<path class="iso-halo" d="${k.haloOf(BED, -BED_H - FOOT_H, BED_H, P)}"/>`]
{
  const feet = [...k.corners(BED, 14), [0, BED.y + 14], [0, BED.y + BED.d - 14]].sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))
  for (const [x, y] of feet) {
    const z0 = -BED_H - FOOT_H
    put('stand.foot', [x, y, z0 + FOOT_H / 2], S(k.cylinder(x, y, 6, z0, 1.5, P, 28), { tone: 'lo' }) + S(k.cylinder(x, y, 4.6, z0 + 1.5, FOOT_H - 1.5, P, 28), { tone: 'mid' }),
      [A.cylinder(x, y, 6, z0, 1.5, { name: 'stand.foot.pad' }), A.cylinder(x, y, 4.6, z0 + 1.5, FOOT_H - 1.5, { name: 'stand.foot' })])
  }
}
put('stand.bed', [0, 0, -BED_H / 2],
  S(k.slabOf(BED, -BED_H, BED_H, P, 8, 1.4), { tone: 'mid', inner: Ln(k.sideSeam(BED, -BED_H + 2.4, P, 8), { tone: 'faint' }) }) +
    Ln(k.planOutline(k.insetPlan(BED, 4), 0, P), { tone: 'faint' }) + ringScrews(k.corners(BED, 7.5), 0, 1.5),
  [A.slab(BED, -BED_H, BED_H, { name: 'stand.bed' })], { key: -1e6 })
// Maker's plate with the /bp/ pill, front right.
{
  const plate = { x: 100, y: BED.y + BED.d - 12, w: 40, d: 9, r: 1 }
  const rules = [[3, 18], [5, 12], [7, 15]].map(([dy, len]) => Ln(k.lineOnTop([plate.x + 3, plate.y + dy], [plate.x + 3 + len, plate.y + dy], 0.8, P), { tone: 'lo', free: true }))
  box('plate', plate, 0, 0.8, { tone: 'lo' }, { steps: 4, extra: Ln(k.planOutline(k.insetPlan(plate, 1.2), 0.8, P, 4), { tone: 'faint' }) + rules.join('') })
  const cx = plate.x + plate.w - 9
  const cy = plate.y + plate.d / 2
  const F = G.frameOf([cx, cy, 0.8], [0, 0, 1], [1, 0, 0], [0, 1, 0])
  const pill = G.stadium(2.1, 2.1, 8, 24).map(([u, v]) => [u - 4, v])
  const mark = `<g transform="${k.topMatrix([cx, cy], 1.15, P, 'x')}"><text class="an-mark" x="0" y="0.85" font-size="2.4" text-anchor="middle"><tspan class="an-slash">/</tspan>bp<tspan class="an-slash">/</tspan></text></g>`
  put('plate.pill', [cx, cy, 1], S(G.prismOf(F, pill, 0, 0.35, P), { tone: 'mid' }) + mark, [A.prism(F, pill, 0, 0.35, { name: 'plate.pill' })], { bias: 0.2 })
}

// A lamp on a face that looks along +y.
function lampY(x, y, z, key, attr) {
  const F = G.frameAlong([x, y, z], [0, 1, 0])
  return { svg: S(G.disc(0, 0.7, 1.4, F, P, { steps: 20 }), { tone: 'mid' }) + `<path class="an-lens" data-${attr}="${key}" d="${G.circleOf(F, 0.71, 0.9, P, 18)}"/>`, shape: A.disc(F, 0, 0.7, 1.4, { name: `lamp.${key}` }) }
}

// ---------- Input gearbox, three handwheels and their counters ----------
{
  const b = BOX
  const counters = WHEELS.map(({ key, x }) => {
    const x0 = x - COUNTER.w / 2
    return `<rect class="an-glass" x="${x0}" y="${-COUNTER.z1}" width="${COUNTER.w}" height="${COUNTER.z1 - COUNTER.z0}"/>` +
      `<text class="an-text" data-counter="${key}" x="${x}" y="${-COUNTER.z0 - 1}" font-size="${COUNTER.font}" text-anchor="middle">0</text>`
  }).join('')
  const bezels = WHEELS.map(({ x }) => k.pathOf([[x - COUNTER.w / 2 - 0.6, FACE_Y, COUNTER.z1 + 0.6], [x + COUNTER.w / 2 + 0.6, FACE_Y, COUNTER.z1 + 0.6], [x + COUNTER.w / 2 + 0.6, FACE_Y, COUNTER.z0 - 0.6], [x - COUNTER.w / 2 - 0.6, FACE_Y, COUNTER.z0 - 0.6]].map(at), true)).join('')
  const vents = Array.from({ length: 6 }, (_, i) => k.planOutline({ x: b.x + 6 + i * 2.6, y: b.y + 6, w: 1.2, d: 12, r: 0.6 }, b.top, P, 3)).join('')
  box('inputs', b, 0, b.top, {}, {
    steps: 3, bevel: 0.6, inner: Ln(k.sideSeam(b, b.top - 3, P, 3), { tone: 'faint' }),
    extra: `<g transform="${facePlane(FACE_Y)}">${counters}</g>` + Ln(bezels, { tone: 'lo' }) + Ln(vents, { tone: 'lo' }) + ringScrews(k.corners(b, 2.4), b.top, 0.7),
  })
  // Wheels: a boss, then the wheel with its rim groove.
  for (const { key, x } of WHEELS) {
    const F = G.frameOf([x, FACE_Y, WHEEL.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
    put(`wheel.${key}`, [x, FACE_Y + 1, WHEEL.z],
      S(G.disc(0, 0.8, 1.6, F, P, { steps: 20 }), { tone: 'mid' }) + S(G.disc(0.8, 1.8, WHEEL.r, F, P, { steps: 40 }), { tone: 'mid' }) + Ln(G.circleOf(F, 1.81, WHEEL.r - 0.9, P, 36), { tone: 'faint' }) +
        S(G.disc(1.8, 2.1, 1.2, F, P, { steps: 18 }), { tone: 'mid' }),
      [A.disc(F, 0, 2.1, WHEEL.r, { name: `wheel.${key}` })])
  }
}

// ---------- Lead screw on two cradles, coupled to the gearbox ----------
// A cradle under a round shaft, its top a saddle the shaft rests in.
function cradle(name, x, y, z, r, w = 4, d = 6) {
  const plan = { x: x - w / 2, y: y - d / 2, w, d, r: 0.4 }
  box(name, plan, 0, z - r, {}, { steps: 2, bevel: 0.25, extra: Dots([at([x, plan.y + 1, z - r]), at([x, plan.y + d - 1, z - r])], { size: 0.38 }) })
}
{
  const F = along(SCREW.x0, SCREW.y, SCREW.z, [1, 0, 0])
  const len = SCREW.x1 - SCREW.x0
  const threads = []
  for (let s = 5; s < len - 3; s += 1.6) threads.push(G.arcOf(F, s, SCREW.r, P, { least: 0.3 }))
  // The coupling first: the screw comes out of its far face toward the reader.
  put('screw', [(SCREW.x0 + SCREW.x1) / 2, SCREW.y, SCREW.z],
    S(G.disc(0, 3, SCREW.r + 1, F, P, { steps: 24 }), { tone: 'mid' }) + Ln(G.arcOf(F, 1.5, SCREW.r + 1, P), { tone: 'faint' }) +
      S(G.disc(3, len, SCREW.r, F, P, { steps: 20 }), { tone: 'mid' }) + Ln(threads.join(''), { tone: 'lo' }),
    [A.disc(F, 0, 3, SCREW.r + 1, { name: 'screw.coupling', owner: 'screw', ground: true }), A.disc(F, 3, len, SCREW.r, { name: 'screw', ground: true })])
  for (const x of [SCREW.x0 + 8, SCREW.x1 - 3]) cradle('screw.cradle', x, SCREW.y, SCREW.z, SCREW.r)
}

// ---------- Input shafts to the solver, along the front ----------
const SHAFTS = [20.5, 23.5]
{
  const x0 = BOX.x + BOX.w
  const x1 = TABLE_PLAN.x + 2
  SHAFTS.forEach((y, i) => {
    const F = along(x0, y, 3, [1, 0, 0])
    put(`shaft.input.${i}`, [(x0 + x1) / 2, y, 3], S(G.disc(0, x1 - x0, 0.8, F, P, { steps: 16 }), { tone: 'mid' }), [A.disc(F, 0, x1 - x0, 0.8, { name: `shaft.input.${i}`, ground: true })])
  })
  for (const x of [-62, -24]) cradle('shaft.cradle', x, (SHAFTS[0] + SHAFTS[1]) / 2, 3, 0.8, 4, SHAFTS[1] - SHAFTS[0] + 4.4)
  const gb = { x: TABLE_PLAN.x + 2, y: SHAFTS[0] - 3, w: 10, d: SHAFTS[1] - SHAFTS[0] + 6, r: 0.8 }
  box('solver.gearbox', gb, 0, 7, {}, { steps: 2, bevel: 0.3, extra: ringScrews(k.corners(gb, 1.4), 7, 0.5) })
}

// ---------- The template: the shot table, cut into a plate ----------
{
  const r = RAIL
  const ticks = k.topTicks(RANGE_X(1), RANGE_X(5.6), 4, 4, r.y + r.d - 3, r.top, [1.4, 2.6], P)
  box('rail', r, 0, r.top, { tone: 'lo' }, { steps: 3, bevel: 0.25, extra: Ln(ticks.minor, { tone: 'lo' }) + Ln(ticks.major, { tone: 'mid' }) + Ln(k.lineOnTop([r.x + 0.3, r.y + 1.6], [r.x + r.w - 0.3, r.y + 1.6], r.top, P), { tone: 'faint' }) })
  // Profile: the top edge is the launch angle, straight between the table's
  // eight points and held flat past either end.
  const knots = (shift) => [CAM.x0, ...TABLE.map(([m]) => RANGE_X(m) - shift).filter((x) => x > CAM.x0 && x < CAM.x1), CAM.x1]
  const top = knots(CAM.follow).map((x) => [x, edgeZ(x)])
  const outline = [[CAM.x0, CAM.base], [CAM.x1, CAM.base], ...top.reverse()]
  const F = G.frameOf([0, CAM.y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  const slot = knots(-CAM.follow)
  const slotPath = [...slot.map((x) => [x, CAM.y1 + 0.01, slotZ(x) + SLOT_HALF]), ...slot.slice().reverse().map((x) => [x, CAM.y1 + 0.01, slotZ(x) - SLOT_HALF])]
  const knotDots = [
    ...TABLE.map(([m]) => [RANGE_X(m) - CAM.follow, CAM.y1 + 0.02, edgeZ(RANGE_X(m) - CAM.follow) - 1.4]),
    ...TABLE.map(([m]) => [RANGE_X(m) + CAM.follow, CAM.y1 + 0.02, slotZ(RANGE_X(m) + CAM.follow) - SLOT_HALF - 1.2]),
  ]
  const feet = [CAM.x0 + 8, CAM.x1 - 8]
  for (const x of feet) box('template.foot', { x: x - 3, y: CAM.y0 - 2, w: 6, d: CAM.y1 - CAM.y0 + 4, r: 0.4 }, 0, CAM.base, { tone: 'lo' }, { steps: 2, bevel: 0.2 })
  put('template', [(CAM.x0 + CAM.x1) / 2, (CAM.y0 + CAM.y1) / 2, 14],
    S(G.prismOf(F, outline, 0, CAM.y1 - CAM.y0, P), { tone: 'mid' }) + `<path class="an-void" d="${k.pathOf(slotPath.map(at), true)}"/>` +
      Dots(knotDots.map(at), { size: 0.42, tone: 'hi' }) + Dots(feet.map((x) => at([x, CAM.y1 + 0.02, CAM.base + 1.4])), { size: 0.4 }),
    [A.prism(F, outline, 0, CAM.y1 - CAM.y0, { name: 'template' })])
}

// ---------- Vector solver table ----------
{
  const t = TABLE_PLAN
  for (const [x, y] of k.corners(t, 4)) put('solver.post', [x, y, TABLE_Z[0] / 2], S(k.cylinder(x, y, 1.6, 0, TABLE_Z[0], P, 18), { tone: 'mid' }), [A.cylinder(x, y, 1.6, 0, TABLE_Z[0], { name: 'solver.post' })])
  // The lead scale: every 5°, a long tick each 15°, the zero brightest.
  const z = TABLE_Z[1] + 0.01
  const tick = (deg, r0, r1) => k.pathOf([at([O[0] + r0 * Math.cos(deg * DEG), O[1] + r0 * Math.sin(deg * DEG), z]), at([O[0] + r1 * Math.cos(deg * DEG), O[1] + r1 * Math.sin(deg * DEG), z])])
  const minor = []
  const major = []
  for (let a = -ARC.span; a <= ARC.span; a += 5) (a % 15 === 0 ? major : minor).push(tick(a, ARC.r - (a % 15 === 0 ? 2.6 : 1.4), ARC.r))
  const arc = k.pathOf(Array.from({ length: 45 }, (_, i) => -ARC.span + (i * 2 * ARC.span) / 44).map((a) => at([O[0] + ARC.r * Math.cos(a * DEG), O[1] + ARC.r * Math.sin(a * DEG), z])))
  box('solver.table', t, TABLE_Z[0], TABLE_Z[1], {}, {
    steps: 3, bevel: 0.4,
    extra: Ln(arc, { tone: 'lo' }) + Ln(minor.join(''), { tone: 'lo' }) + Ln(major.join(''), { tone: 'mid' }) + Ln(tick(0, ARC.r - 4, ARC.r), { tone: 'hi' }) +
      Ln(k.pathOf([at([O[0] + 4, O[1], z]), at([O[0] + ARC.r - 6, O[1], z])]), { tone: 'faint' }) + ringScrews(k.corners(t, 2.4), TABLE_Z[1], 0.6),
  })
  box('solver.rail', { x: O[0] + 2, y: -1.1, w: 32, d: 2.2, r: 0.3 }, TABLE_Z[1], 14.6, { tone: 'lo' }, { steps: 1, bevel: 0.15 })
  put('solver.pivot', [O[0], O[1], 15.5], S(k.cylinder(O[0], O[1], 2.2, TABLE_Z[1], ARM_BASE - TABLE_Z[1], P, 24), { tone: 'mid' }),
    [A.cylinder(O[0], O[1], 2.2, TABLE_Z[1], ARM_BASE - TABLE_Z[1], { name: 'solver.pivot' })])
  // Solver to tower: a shaft along the back with a pillow block.
  const y = -20
  const x0 = t.x + t.w - 6
  const x1 = TOWER.x
  const F = along(x0, y, 5, [1, 0, 0])
  box('solver.outbox', { x: x0 - 8, y: y - 4, w: 8, d: 8, r: 0.6 }, 0, 9, {}, { steps: 2, bevel: 0.3 })
  put('shaft.output', [(x0 + x1) / 2, y, 5], S(G.disc(0, x1 - x0, 0.9, F, P, { steps: 16 }), { tone: 'mid' }), [A.disc(F, 0, x1 - x0, 0.9, { name: 'shaft.output', ground: true })])
  cradle('shaft.cradle', 80, y, 5, 0.9)
}

// ---------- Hood quadrant ----------
{
  const q = QUAD
  const [qx, qz] = QPIVOT
  box('quadrant.foot', { x: q.x - 3, y: q.y - 4, w: q.w + 6, d: q.d + 8, r: 0.8 }, 0, q.z0, { tone: 'lo' }, { steps: 3, bevel: 0.3 })
  // Engraved arc, ticks every 2°, long each 10°, in the face plane.
  const y = QFACE + 0.01
  const p = (deg, r) => at([qx + r * Math.cos(deg * DEG), y, qz + r * Math.sin(deg * DEG)])
  const minor = []
  const major = []
  for (let a = QARC.from; a <= QARC.to; a += 2) (a % 10 === 0 ? major : minor).push(k.pathOf([p(a, QARC.r - (a % 10 === 0 ? 2.6 : 1.4)), p(a, QARC.r)]))
  const arc = k.pathOf(Array.from({ length: 30 }, (_, i) => p(QARC.from + (i * (QARC.to - QARC.from)) / 29, QARC.r)))
  // Guides for the two slides: a channel along the foot and one up the left.
  const channel = (x0, z0, x1, z1) => `<path class="an-void" d="${k.pathOf([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(at), true)}"/>`
  const plateOutline = [[q.x, q.z0], [q.x + q.w, q.z0], [q.x + q.w, qz + 20], [qx + QARC.r * Math.cos(QARC.from * DEG) + 3, qz + QARC.r * Math.sin(QARC.from * DEG) + 3], [qx + 10, q.z1], [q.x, q.z1]]
  const F = G.frameOf([0, q.y, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1])
  put('quadrant', [q.x + q.w / 2, q.y + q.d / 2, (q.z0 + q.z1) / 2],
    S(G.prismOf(F, plateOutline, 0, q.d, P), { tone: 'mid' }) + Ln(arc, { tone: 'lo' }) + Ln(minor.join(''), { tone: 'lo' }) + Ln(major.join(''), { tone: 'mid' }) +
      channel(q.x + 4, 3.2, q.x + q.w - 4, 4.6) + channel(q.x + 1.4, 8, q.x + 2.8, q.z1 - 4) + Dots([[q.x + 2.2, y, q.z1 - 2], [q.x + q.w - 2.2, y, q.z0 + 2]].map(at), { size: 0.45 }),
    [A.prism(F, plateOutline, 0, q.d, { name: 'quadrant' })])
}

// ---------- Readout tower ----------
{
  const t = TOWER
  const l = lampY(LAMP.x, TFACE, LAMP.z, 'fire', 'fire')
  const dial = (d, ticks) => {
    const F = G.frameOf([d.x, TFACE, d.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
    const DF = dialFrame(d)
    const lines = ticks.map(([a, long]) => k.pathOf([at(G.pointOf(DF, 0.01, d.r - (long ? 1.8 : 1), a)), at(G.pointOf(DF, 0.01, d.r - 0.2, a))]))
    return { svg: S(G.disc(0, 0.9, d.r + 0.9, F, P, { steps: 48 }), { tone: 'mid' }) + `<path class="an-glass" d="${G.circleOf(DF, 0, d.r, P, 48)}"/>` + Ln(lines.join(''), { tone: 'lo' }),
      shape: A.disc(F, 0, 0.9, d.r + 0.9, { name: 'tower.dial' }) }
  }
  const leadTicks = []
  for (let a = -60; a <= 60; a += 10) leadTicks.push([leadDialAngle(a), a % 30 === 0])
  const flyTicks = []
  for (let v = FLY_DIAL.from; v <= FLY_DIAL.to + 1e-9; v += 0.5) flyTicks.push([flyDialAngle(v), Math.abs(v - Math.round(v)) < 1e-6])
  const d1 = dial(LEAD_DIAL, leadTicks)
  const d2 = dial(FLY_DIAL, flyTicks)
  box('tower', t, 0, t.top, {}, {
    steps: 3, bevel: 0.6, inner: Ln(k.sideSeam(t, t.top - 3, P, 3), { tone: 'faint' }),
    extra: d1.svg + d2.svg + l.svg + ringScrews(k.corners(t, 2.4), t.top, 0.7) + Ln(k.planOutline(k.insetPlan(t, 5), t.top, P, 3), { tone: 'faint' }),
  })
  ;[d1, d2, l].forEach((d) => R.solid(d.shape))
}

// ---------- Slots ----------
const thin = (name, min, max) => [A.box(min, max, { name, ground: true })]
for (const { key, x } of WHEELS) put(`slot.wheel.${key}`, [x, FACE_Y + 2.2, WHEEL.z], '', thin(`slot.wheel.${key}`, [x - 3, FACE_Y + 2.1, WHEEL.z - 3], [x + 3, FACE_Y + 2.15, WHEEL.z + 3]), { slot: `wheel_${key}` })
put('slot.carriage', [RANGE_X(3), 6, 20], '', thin('slot.carriage', [CAM.x0 + 6, RAIL.y + 1, RAIL.top], [CAM.x1 - 6, RAIL.y + 2, RAIL.top + 0.05]), { slot: 'carriage' })
put('slot.solver', [O[0] + 14, 0, 16.5], '', thin('slot.solver', [O[0] + 4, -2, 14.6], [O[0] + 30, 2, 14.65]), { slot: 'solver' })
put('slot.quadrant', [QPIVOT[0] + 10, QFACE + 1, QPIVOT[1] + 18], '', thin('slot.quadrant', [QUAD.x + 4, QFACE + 0.02, QUAD.z0 + 4], [QUAD.x + 30, QFACE + 0.05, QUAD.z1 - 6]), { slot: 'quadrant' })
put('slot.needles', [124, TFACE + 1, 19], '', thin('slot.needles', [LEAD_DIAL.x - 3, TFACE + 0.92, 16], [FLY_DIAL.x + 3, TFACE + 0.95, 22]), { slot: 'needles' })

// The rest pose: still, 2.7 m out.
const REST = solve([-2.7, 0], [0, 0], [0, 0])
finish(R, P, {
  name: 'firecontrol',
  W,
  H,
  prefix,
  label:
    "A fire-control computer that solves the robot's shot on the move. Three handwheels set range, speed and course. A carriage reads the launch angle and the horizontal speed off a template cut from the robot's eight-point shot table. A vector solver takes the robot's velocity off the shot, so a slotted arm points the lead. A quadrant turns the result into the hood angle, and two dials show the lead and the flywheel speed.",
  mustFollow: [
    ['slot.carriage', 'template'], ['slot.carriage', 'screw'], ['slot.carriage', 'rail'], ['shaft.input.0', 'slot.carriage'], ['shaft.input.1', 'shaft.input.0'],
    ['slot.solver', 'solver.rail'], ['slot.solver', 'solver.pivot'], ['slot.solver', 'solver.table'],
    ['slot.quadrant', 'quadrant'], ['slot.needles', 'tower'],
    ...WHEELS.map(({ key }) => [`slot.wheel.${key}`, `wheel.${key}`]),
  ],
  preview: () => ({
    slots: {
      wheel_range: wheelSvg(WHEELS[0].x, wheelAngle.range(2.7)), wheel_speed: wheelSvg(WHEELS[1].x, 0), wheel_course: wheelSvg(WHEELS[2].x, 0),
      carriage: carriageSvg(REST.distance) + rodTopsSvg(REST.distance),
      solver: solverSvg(REST.vh, [0, 0], Math.PI),
      quadrant: quadrantSvg(REST.horizontal, REST.vv, REST.hood),
      needles: needlesSvg(REST.lead, REST.lead, REST.speed),
    },
    plate: { fig: '// fig 01', title: 'shoot on the move', hint: 'hover to drive', readout: `${REST.distance.toFixed(1)} m · 0.0 m/s · lead 0° · hood ${Math.round(REST.hood)}°` },
  }),
})
