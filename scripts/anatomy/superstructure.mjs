// The 2025 superstructure figure: a signal-box lever frame wired to a bench
// model of the elevator and pivot arm. The levers, lift strap, inner stage and
// arm move, so they are slots here; the page draws them every frame with the
// builders in src/anatomy/superstructure/scene.js.
import * as k from '../../src/anatomy/kit/iso-kit.mjs'
import * as G from '../../src/anatomy/kit/lathe.mjs'
import * as A from '../../src/anatomy/kit/audit.mjs'
import { workshop, finish } from './common.mjs'
import {
  W, H, P, V, at, BENCH, BENCH_H, FOOT_H, FRAME, PLINTH_H, CASE_TOP, PLATE_Z, LEVER, LEVERS, leverX,
  leverParts, leverSvg, BAR, BOARD, MX, MY, MAST_BASE, MAST_BASE_H, OUTER, INNER, ARM_Y, AXLE_Z0, ARM, armParts, armSvg,
  DRUM_Z, PULLEY_Z, STRAP, STRAP_FOOT, strapSvg, POST, POST_R, HOPPER, DESCRIBER, SCREEN, TROUGH_A, TROUGH_B, GEARBOX,
} from '../../src/anatomy/superstructure/scene.js'
import { STATES, PIVOT, TONGUE } from '../../src/anatomy/superstructure/model.js'

const { R, S, Ln, Dots, seg, put, box, ringScrews, facePlane } = workshop(P)

// ---------- Bench ----------
const prefix = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`]
for (const [x, y] of [...k.corners(BENCH, 12)].sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
  const z0 = -BENCH_H - FOOT_H
  put('stand.foot', [x, y, z0 + FOOT_H / 2],
    S(k.cylinder(x, y, 5, z0, 1.2, P, 28), { tone: 'lo' }) + S(k.cylinder(x, y, 3.8, z0 + 1.2, FOOT_H - 1.2, P, 28), { tone: 'mid' }),
    [A.cylinder(x, y, 5, z0, 1.2, { name: 'stand.foot.pad' }), A.cylinder(x, y, 3.8, z0 + 1.2, FOOT_H - 1.2, { name: 'stand.foot' })])
}
{
  const ruler = { x: FRAME.x + 1, y: BENCH.y + BENCH.d - 4.6, w: FRAME.w - 2, d: 3, r: 0.4 }
  const ticks = k.topTicks(ruler.x + 1.5, ruler.x + ruler.w - 1.5, 1.5, 5, ruler.y + 0.4, 0.45, [0.9, 1.7], P)
  const plate = { x: POST.x - 24, y: BENCH.y + BENCH.d - 13, w: 20, d: 9, r: 1 }
  const rules = [[3.2, 15], [5.4, 11], [7.6, 13]].map(([dy, len]) => Ln(k.lineOnTop([plate.x + 3, plate.y + dy], [plate.x + 3 + len, plate.y + dy], 0.7, P), { tone: 'lo', free: true }))
  const svg =
    S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.4), { tone: 'mid' }) +
    Ln(k.planOutline(k.insetPlan(BENCH, 4), 0, P), { tone: 'faint' }) +
    ringScrews(k.corners(BENCH, 8), 0, 1.5) +
    S(k.slabOf(ruler, 0, 0.45, P, 3), { tone: 'lo', crease: 'none' }) +
    Ln(ticks.minor, { tone: 'lo' }) + Ln(ticks.major, { tone: 'mid' }) +
    S(k.slabOf(plate, 0, 0.7, P, 4), { tone: 'lo' }) +
    Ln(k.planOutline(k.insetPlan(plate, 1.2), 0.7, P, 4), { tone: 'faint' }) +
    rules.join('') +
    Dots([at([plate.x + plate.w - 3, plate.y + 3, 0.7]), at([plate.x + plate.w - 3, plate.y + plate.d - 3, 0.7])], { size: 0.45 })
  put('stand.bench', [0, 0, -BENCH_H / 2], svg, [A.slab(BENCH, -BENCH_H, BENCH_H, { name: 'stand.bench' })], { key: -1e6 })
}

// ---------- Lever frame ----------
const plinth = k.insetPlan(FRAME, -1.1)
box('frame.plinth', plinth, 0, PLINTH_H, { tone: 'lo' }, { bevel: 0.3, extra: ringScrews(k.corners(plinth, 1.8), PLINTH_H, 0.6) })
box('frame.case', FRAME, PLINTH_H, CASE_TOP, {}, { bevel: 0.45, inner: Ln(k.sideSeam(FRAME, 4.6, P, 3), { tone: 'faint' }) })
{
  const plate = k.insetPlan(FRAME, -0.45)
  const slots = Array.from({ length: LEVERS }, (_, i) => k.planOutline({ x: leverX(i) - 0.62, y: LEVER.pivotY - 1.95, w: 1.24, d: 3.9, r: 0.62 }, PLATE_Z, P, 4)).join('')
  const screws = [...k.corners(plate, 1.2), [plate.x + plate.w / 2, plate.y + 1.2], [plate.x + plate.w / 2, plate.y + plate.d - 1.2]]
  box('frame.plate', plate, CASE_TOP, PLATE_Z, {}, { bevel: 0.3, extra: Ln(slots, { tone: 'lo' }) + Dots(screws.map(([x, y]) => at([x, y, PLATE_Z])), { size: 0.4 }) })
}
// Back board: a lamp over each lever and a description strip.
const LAMP_Z = 15.4
{
  const face = BOARD.y + BOARD.d
  const card = { x: FRAME.x + 1.4, y: face, w: FRAME.w - 2.8, d: 0.25, r: 0.1 }
  const cardFace = face + card.d + 0.01
  const rules = Array.from({ length: LEVERS }, (_, i) => Ln(seg([leverX(i) - 1.05, cardFace, 17.7], [leverX(i) + 1.05, cardFace, 17.7]), { tone: 'lo', free: true })).join('')
  box('frame.board', BOARD, 0, BOARD.top, {}, { bevel: 0.3, extra: Dots([at([BOARD.x + 1.1, face + 0.01, 2]), at([BOARD.x + BOARD.w - 1.1, face + 0.01, 2])], { size: 0.4 }) })
  box('frame.card', card, 17, 18.4, { tone: 'lo' }, { steps: 2, extra: rules })
  for (let i = 0; i < LEVERS; i++) {
    const F = G.frameAlong([leverX(i), face, LAMP_Z], [0, 1, 0])
    const svg = S(G.disc(0, 0.95, 0.83, F, P, { steps: 24 }), { tone: 'mid' }) + `<path class="an-lens" data-lamp="${i}" d="${G.circleOf(F, 0.96, 0.52, P, 20)}"/>`
    put(`frame.lamp.${i}`, [leverX(i), face + 0.5, LAMP_Z], svg, [A.disc(F, 0, 0.95, 0.83, { name: `frame.lamp.${i}` })])
  }
}
// Electric lever locks, one behind each lever, each with a flag window.
for (let i = 0; i < LEVERS; i++) {
  const x = leverX(i)
  const plan = { x: x - 1.35, y: FRAME.y, w: 2.7, d: 3.2, r: 0.3 }
  const top = PLATE_Z + 2.7
  const face = plan.y + plan.d + 0.01
  const win = [[x - 0.8, PLATE_Z + 0.8], [x + 0.8, PLATE_Z + 0.8], [x + 0.8, PLATE_Z + 1.95], [x - 0.8, PLATE_Z + 1.95]]
  const flag = `<g transform="${facePlane(face)}"><path class="an-flag" data-flag="${i}" d="${k.pathOf(win.map(([lx, lz]) => [lx, -lz]), true)}"/></g>`
  const outline = Ln(k.pathOf(win.map(([lx, lz]) => at([lx, face, lz])), true), { tone: 'lo' })
  box(`frame.lock.${i}`, plan, PLATE_Z, top, {}, { steps: 2, bevel: 0.22, extra: flag + outline + Dots([at([x - 0.8, plan.y + 0.9, top]), at([x + 0.8, plan.y + 0.9, top])], { size: 0.32 }) })
}
// Number plates on the front of the case.
const FRONT = FRAME.y + FRAME.d
for (let i = 0; i < LEVERS; i++) {
  const x = leverX(i)
  const plan = { x: x - 1.35, y: FRONT, w: 2.7, d: 0.36, r: 0.15 }
  const f = FRONT + plan.d + 0.01
  const extra =
    Ln(seg([x - 0.9, f, 5.2], [x + 0.9, f, 5.2]), { tone: 'mid', free: true }) +
    Ln(seg([x - 0.55, f, 4.2], [x + 0.55, f, 4.2]), { tone: 'lo', free: true }) +
    Dots([at([x - 1.0, f, 6]), at([x + 1.0, f, 6])], { size: 0.3 })
  box(`frame.number.${i}`, plan, 3.3, 6.6, { tone: 'lo' }, { steps: 2, bevel: 0.15, extra })
}

// ---------- Describer (route display) ----------
// It stands behind the frame against the back board; its screen and maker's
// pill show above the board, its lamps sit on top.
{
  const D = DESCRIBER
  const face = D.y + D.d
  const s = SCREEN
  const depth = 0.7
  const back = face - depth
  const quad = (pts) => k.pathOf(pts.map(at), true)
  const recess =
    `<g transform="${facePlane(back)}"><rect class="an-glass" x="${s.x0}" y="${-s.z1}" width="${s.x1 - s.x0}" height="${s.z1 - s.z0}"/></g>` +
    `<path class="iso-top" d="${quad([[s.x0, back, s.z0], [s.x1, back, s.z0], [s.x1, face, s.z0], [s.x0, face, s.z0]])}"/>` +
    `<path class="iso-shade" data-shade="2" d="${quad([[s.x0, back, s.z0], [s.x0, back, s.z1], [s.x0, face, s.z1], [s.x0, face, s.z0]])}"/>` +
    Ln(k.pathOf([[s.x0, face, s.z1], [s.x0, back, s.z1], [s.x0, back, s.z0], [s.x1, back, s.z0], [s.x1, face, s.z0]].map(at)), { tone: 'faint' }) +
    Ln(k.pathOf([[s.x0, face, s.z0], [s.x1, face, s.z0], [s.x1, face, s.z1], [s.x0, face, s.z1]].map(at), true), { tone: 'lo' })
  const clip = `<clipPath id="ss-screen"><rect x="${s.x0}" y="${-s.z1}" width="${s.x1 - s.x0}" height="${s.z1 - s.z0}"/></clipPath>`
  const lineZ = [s.z1 - 2.9, s.z1 - 6.1]
  const caretX = s.x0 + 1 + s.font * 0.6 * 2
  const text =
    `<g transform="${facePlane(back)}">${clip}<g clip-path="url(#ss-screen)">` +
    `<text class="an-text" data-line="0" x="${s.x0 + 1}" y="${-lineZ[0]}" font-size="${s.font}">stow</text>` +
    `<text class="an-text" data-line="1" data-dim="" x="${s.x0 + 1}" y="${-lineZ[1]}" font-size="${s.font}">&gt;</text>` +
    `<rect class="an-caret" data-caret="" x="${caretX}" y="${-lineZ[1] - s.font * 0.72}" width="${s.font * 0.55}" height="${s.font * 0.82}"/>` +
    '</g></g>'
  const bezel = Dots([[s.x0 - 0.8, s.z0 - 0.8], [s.x1 + 0.8, s.z0 - 0.8], [s.x0 - 0.8, s.z1 + 0.8], [s.x1 + 0.8, s.z1 + 0.8]].map(([x, z]) => at([x, face + 0.01, z])), { size: 0.38 })
  const vents = Array.from({ length: 4 }, (_, j) => k.planOutline({ x: D.x + 2.2 + 1.8 * j, y: D.y + 2, w: 0.9, d: 6, r: 0.45 }, D.top, P, 4)).join('')
  const seam = Ln(k.sideSeam(D, D.top - 2.4, P, 4), { tone: 'faint' })
  box('describer.body', D, 0, D.top, {}, {
    steps: 4, bevel: 0.5, inner: seam,
    extra: Ln(vents, { tone: 'lo' }) + recess + text + bezel,
  })
  // Indication lamps on top: elevator, pivot, pole switches.
  const LAMP_NAMES = ['elevator', 'pivot', 'pole']
  LAMP_NAMES.forEach((name, j) => {
    const x = D.x + 11.5 + 4 * j
    const y = D.y + D.d / 2
    const svg = S(k.cylinder(x, y, 1.2, D.top, 0.8, P, 24), { tone: 'mid' }) + S(k.cylinder(x, y, 0.85, D.top + 0.8, 0.5, P, 22), { tone: 'mid' }) +
      `<path class="an-lens" data-lamp="${name}" d="${k.onTop(k.circleRing(x, y, 0.7, 22), D.top + 1.31, P, true)}"/>`
    put(`describer.lamp.${name}`, [x, y, D.top + 0.6], svg, [A.cylinder(x, y, 1.2, D.top, 0.8, { name: 'describer.lamp' }), A.cylinder(x, y, 0.85, D.top + 0.8, 0.5, { name: 'describer.lamp.cap' })])
  })
  // The maker's pill: /bp/, engraved, the one label in the drawing.
  {
    const cx = s.x1 - 3.6
    const cz = s.z1 + 2.6
    const F = G.frameOf([cx - 2.4, face, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1])
    const pill = G.stadium(1.25, 1.25, 4.8, 24)
    const text = `<g transform="${k.sideMatrix([cx, face + 0.36], cz, P, 'left')}"><text class="an-mark" x="0" y="0.5" font-size="1.45" text-anchor="middle"><tspan class="an-slash">/</tspan>bp<tspan class="an-slash">/</tspan></text></g>`
    put('describer.maker', [cx, face + 0.2, cz], S(G.prismOf(F, pill, 0, 0.35, P), { tone: 'mid' }) + text, [A.prism(F, pill, 0, 0.35, { name: 'describer.maker' })], { bias: 0.5 })
  }
}

// ---------- Cable trough ----------
// Lid joints at absolute x (trough A) or y (trough B), each with a screw either side.
for (const [name, plan, joints] of [['trough.a', TROUGH_A, [TROUGH_A.x + 4, TROUGH_A.x + 7.5]], ['trough.b', TROUGH_B, [TROUGH_B.y + 7, TROUGH_B.y + 16]]]) {
  const along = plan.w > plan.d
  const lines = joints.map((c) => along
    ? k.lineOnTop([c, plan.y], [c, plan.y + plan.d], 2.6, P)
    : k.lineOnTop([plan.x, c], [plan.x + plan.w, c], 2.6, P)).join('')
  const screws = joints.flatMap((c) => along
    ? [[c - 1.6, plan.y + plan.d / 2], [c + 1.6, plan.y + plan.d / 2]]
    : [[plan.x + plan.w / 2, c - 1.6], [plan.x + plan.w / 2, c + 1.6]])
  box(name, plan, 0, 2.6, { tone: 'lo' }, { steps: 2, bevel: 0.25, inner: Ln(k.sideSeam(plan, 2, P, 2), { tone: 'faint' }), extra: Ln(lines, { tone: 'faint' }) + Dots(screws.map(([x, y]) => at([x, y, 2.6])), { size: 0.34 }) })
}

// ---------- Elevator gearbox and motors ----------
box('mast.gearbox', GEARBOX, 0, 10, {}, { steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(GEARBOX, 5, P, 3), { tone: 'faint' }), extra: Dots([[GEARBOX.x + 1.2, GEARBOX.y + 1.2], [GEARBOX.x + 1.2, GEARBOX.y + GEARBOX.d - 1.2]].map(([x, y]) => at([x, y, 10])), { size: 0.42 }) })
for (const [x, y] of [[GEARBOX.x + 3.6, GEARBOX.y + 3], [GEARBOX.x + 3.6, GEARBOX.y + 8.8]]) {
  const svg =
    S(k.cylinder(x, y, 1.35, 10, 5.2, P, 28), { tone: 'mid' }) +
    Ln(k.knurl(x, y, 1.35, 10, 15.2, 20, P, 0), { tone: 'lo' }) +
    S(k.cylinder(x, y, 1.0, 15.2, 0.7, P, 24), { tone: 'mid' }) +
    Ln(k.ring(x, y, 0.4, 15.9, P, 12), { tone: 'lo' })
  put('mast.motor', [x, y, 12.5], svg, [A.cylinder(x, y, 1.35, 10, 5.2, { name: 'mast.motor' }), A.cylinder(x, y, 1.0, 15.2, 0.7, { name: 'mast.motor.cap' })])
}
{
  const F = G.frameAlong([GEARBOX.x + GEARBOX.w, MY, DRUM_Z], [1, 0, 0])
  const len = MX - OUTER.half - OUTER.size / 2 - (GEARBOX.x + GEARBOX.w)
  put('mast.shaft', [GEARBOX.x + GEARBOX.w + len / 2, MY, DRUM_Z],
    S(G.disc(0, len - 0.5, 0.45, F, P, { steps: 16 }), { tone: 'mid' }) + S(G.disc(len - 0.5, len, 1.0, F, P, { steps: 20 }), { tone: 'mid' }),
    [A.disc(F, 0, len - 0.5, 0.45, { name: 'mast.shaft' }), A.disc(F, len - 0.5, len, 1.0, { name: 'mast.shaft.bearing' })])
}

// ---------- Mast: base plate and outer stage ----------
box('mast.base', MAST_BASE, 0, MAST_BASE_H, { tone: 'lo' }, { bevel: 0.4, extra: ringScrews(k.corners(MAST_BASE, 2.2), MAST_BASE_H, 0.8) })
const upright = (sx) => ({ x: MX + sx * OUTER.half - OUTER.size / 2, y: MY - OUTER.size / 2, w: OUTER.size, d: OUTER.size, r: 0.25 })
const crossbar = { x: MX - OUTER.half + OUTER.size / 2, y: MY - OUTER.size / 2, w: 2 * OUTER.half - OUTER.size, d: OUTER.size, r: 0.2 }
for (const sx of [-1, 1]) {
  const plan = upright(sx)
  const face = plan.y + plan.d + 0.01
  const rivets = Array.from({ length: 8 }, (_, j) => at([MX + sx * OUTER.half, face, MAST_BASE_H + 4 + j * 4.6]))
  box(`mast.outer.${sx > 0 ? 'right' : 'left'}`, plan, MAST_BASE_H, OUTER.top, {}, { steps: 2, bevel: 0.25, extra: Dots(rivets, { size: 0.32, tone: 'lo' }) })
}
box('mast.outer.bottom', crossbar, MAST_BASE_H, MAST_BASE_H + 2, {}, { steps: 2, bevel: 0.2 })
box('mast.outer.top', crossbar, OUTER.top - 2.4, OUTER.top, {}, { steps: 2, bevel: 0.2 })
{
  const F = G.frameAlong([crossbar.x, MY, DRUM_Z], [1, 0, 0])
  const svg = S(G.disc(0.3, crossbar.w - 0.3, 1.2, F, P, { steps: 28 }), { tone: 'mid' }) +
    S(G.disc(0, 0.3, 1.7, F, P, { steps: 28 }), { tone: 'mid' }) + S(G.disc(crossbar.w - 0.3, crossbar.w, 1.7, F, P, { steps: 28 }), { tone: 'mid' })
  put('mast.drum', [MX, MY, DRUM_Z], svg, [A.disc(F, 0, crossbar.w, 1.7, { name: 'mast.drum' })])
}
{
  // Top pulley on two brackets above the crossbar.
  for (const bx of [MX - 1.9, MX + 1.3]) box('mast.pulley.bracket', { x: bx, y: MY - OUTER.size / 2, w: 0.6, d: OUTER.size, r: 0.15 }, OUTER.top, PULLEY_Z + 1.4, {}, { steps: 2 })
  const F = G.frameAlong([MX - 1.3, MY, PULLEY_Z], [1, 0, 0])
  put('mast.pulley', [MX, MY, PULLEY_Z], S(G.disc(0, 2.6, 1.3, F, P, { steps: 28 }), { tone: 'mid' }) + Ln(G.circleOf(G.frameAlong([MX + 1.31, MY, PULLEY_Z], [1, 0, 0]), 0, 0.35, P, 12), { tone: 'lo' }), [A.disc(F, 0, 2.6, 1.3, { name: 'mast.pulley' })])
}
// Strap back run, drum to pulley.
box('mast.strap.back', { x: STRAP.x, y: MY - 1.58, w: STRAP.w, d: 0.3, r: 0.1 }, DRUM_Z, PULLEY_Z, { tone: 'lo', crease: 'none' }, { steps: 2 })
// Bearing blocks at the top of the outer stage that the inner stage rides on.
for (const sx of [-1, 1]) {
  const plan = { x: sx > 0 ? MX + INNER.half + INNER.size / 2 : MX - OUTER.half - 0.6, y: MY + OUTER.size / 2, w: 1.7, d: 1.8, r: 0.2 }
  box('mast.outer.bearing', plan, OUTER.top - 2, OUTER.top, {}, { steps: 2, extra: Dots([at([plan.x + 0.85, plan.y + plan.d + 0.01, OUTER.top - 1])], { size: 0.32 }) })
}

// ---------- Slots: strap front run, inner stage, arm ----------
const INNER_SHAPES = innerStage(0, { record: true })
put('slot.strap', [MX, MY + 1.4, 22], '', [A.slab({ ...STRAP, r: 0.1 }, STRAP_FOOT, PULLEY_Z - STRAP_FOOT, { name: 'slot.strap' }, 2)], { slot: 'strap' })
put('slot.stage', [MX, INNER.y + 1, 22], '', INNER_SHAPES, { slot: 'stage' })
{
  const { F } = armParts(PIVOT.STOW, TONGUE.STOW, 0.6)
  const bar = [[-ARM.thick, -ARM.half], [ARM.thick, -ARM.half], [ARM.thick, ARM.half], [-ARM.thick, ARM.half]]
  const boxPoly = [[-ARM.boxY, ARM.box[0]], [ARM.boxY, ARM.box[0]], [ARM.boxY, ARM.box[1]], [-ARM.boxY, ARM.box[1]]]
  put('slot.arm', G.add3(F.o, G.mul3(F.a, 12)), '', [
    A.prism(F, bar, 0, ARM.bar, { name: 'slot.arm.bar', owner: 'arm' }),
    A.prism(F, boxPoly, ARM.bar - 0.6, ARM.tip, { name: 'slot.arm.effector', owner: 'arm' }),
    A.disc(G.frameAlong(F.o, [0, 1, 0]), -1.6, 2.6, 2.3, { name: 'slot.arm.hub', owner: 'arm' }),
  ], { slot: 'arm' })
}

// The inner stage, drawn at carriage height 0. The page wraps it in a
// translate. With `record` it returns its shapes instead of markup.
function innerStage(e, { record = false } = {}) {
  const shapes = []
  const out = []
  const add = (name, plan, z0, z1, style = {}, opts = {}) => {
    shapes.push(A.slab(plan, z0 + e, z1 - z0, { name }, opts.steps ?? 2))
    out.push(S(k.slabOf(plan, z0 + e, z1 - z0, P, opts.steps ?? 2, opts.bevel ?? 0.2), { tone: 'mid', ...style, inner: opts.inner }) + (opts.extra ?? ''))
  }
  const base = MAST_BASE_H + 2
  const top = base + INNER.height
  const iu = (sx) => ({ x: MX + sx * INNER.half - INNER.size / 2, y: INNER.y - INNER.size / 2, w: INNER.size, d: INNER.size, r: 0.2 })
  const ibar = { x: MX - INNER.half + INNER.size / 2, y: INNER.y - INNER.size / 2, w: 2 * INNER.half - INNER.size, d: INNER.size, r: 0.15 }
  for (const sx of [-1, 1]) {
    const plan = { x: sx > 0 ? MX + INNER.half + INNER.size / 2 : MX - OUTER.half - 0.6, y: MY + OUTER.size / 2, w: 1.7, d: 1.8, r: 0.2 }
    add('stage.bearing', plan, base, base + 1.6, {}, { extra: Dots([at([plan.x + 0.85, plan.y + plan.d + 0.01, base + 0.8 + e])], { size: 0.32 }) })
  }
  for (const sx of [-1, 1]) {
    const plan = iu(sx)
    const holes = Array.from({ length: 6 }, (_, j) => at([MX + sx * INNER.half, plan.y + plan.d + 0.01, base + 5 + j * 5 + e]))
    add('stage.upright', plan, base, top, {}, { extra: Dots(holes, { size: 0.3, tone: 'lo' }) })
  }
  add('stage.bottom', ibar, base, base + 2)
  // Strap clamp on top of the bottom cross-member; the strap's front run ends on it.
  add('stage.clamp', { x: MX - 0.9, y: MY + OUTER.size / 2, w: 1.8, d: INNER.y - INNER.size / 2 - MY - OUTER.size / 2, r: 0.1 }, base + 2, STRAP_FOOT, {}, { extra: Dots([at([MX, INNER.y - INNER.size / 2 + 0.01, base + 3 + e])], { size: 0.3 }) })
  add('stage.top', ibar, top - 2, top)
  // Pivot gearbox on the front of the stage, holding the axle.
  const gb = { x: MX - 3.4, y: INNER.y + INNER.size / 2, w: 6.8, d: 2.6, r: 0.5 }
  const gz0 = AXLE_Z0 - 3.2
  const gz1 = AXLE_Z0 + 3.2
  const gface = gb.y + gb.d + 0.01
  add('stage.gearbox', gb, gz0, gz1, {}, {
    steps: 3, bevel: 0.4, inner: Ln(k.sideSeam(gb, gz0 + 1.6 + e, P, 3), { tone: 'faint' }),
    extra: Dots([[gb.x + 0.9, gz0 + 0.9], [gb.x + gb.w - 0.9, gz0 + 0.9], [gb.x + 0.9, gz1 - 0.9], [gb.x + gb.w - 0.9, gz1 - 0.9]].map(([x, z]) => at([x, gface, z + e])), { size: 0.36 }),
  })
  // Pivot motor standing on the gearbox.
  const mx = MX + 1.6
  const my = gb.y + gb.d / 2
  shapes.push(A.cylinder(mx, my, 1.2, gz1 + e, 4.6, { name: 'stage.motor' }))
  out.push(S(k.cylinder(mx, my, 1.2, gz1 + e, 4.6, P, 24), { tone: 'mid' }) + Ln(k.knurl(mx, my, 1.2, gz1 + e, gz1 + 4.6 + e, 18, P, 0), { tone: 'lo' }) + S(k.cylinder(mx, my, 0.85, gz1 + 4.6 + e, 0.6, P, 20), { tone: 'mid' }))
  shapes.push(A.cylinder(mx, my, 0.85, gz1 + 4.6 + e, 0.6, { name: 'stage.motor.cap' }))
  // Axle stub from the gearbox face to the arm hub.
  const AF = G.frameAlong([MX, gb.y + gb.d, AXLE_Z0 + e], [0, 1, 0])
  const stub = ARM_Y - 1.6 - (gb.y + gb.d)
  shapes.push(A.disc(AF, 0, stub, 0.7, { name: 'stage.axle' }))
  out.push(S(G.disc(0, stub, 0.7, AF, P, { steps: 18 }), { tone: 'mid' }))
  return record ? shapes : out.join('')
}

// ---------- Intake hopper ----------
{
  const h = HOPPER
  const t = 0.6
  const floor = h.z + t
  box('hopper.floor', h, h.z, floor, { tone: 'lo' }, { steps: 2 })
  box('hopper.back', { x: h.x, y: h.y, w: h.w, d: t, r: 0.2 }, floor, h.top, {}, { steps: 2, bevel: 0.2 })
  for (const [side, x] of [['left', h.x], ['right', h.x + h.w - t]]) {
    box(`hopper.${side}.back`, { x, y: h.y + t, w: t, d: ARM_Y - h.y - t, r: 0 }, floor, h.top, {}, { steps: 1 })
    box(`hopper.${side}.front`, { x, y: ARM_Y, w: t, d: h.y + h.d - t - ARM_Y, r: 0 }, floor, h.top, {}, { steps: 1 })
  }
  box('hopper.front', { x: h.x, y: h.y + h.d - t, w: h.w, d: t, r: 0.2 }, floor, h.top - 3.5, {}, { steps: 2, bevel: 0.2 })
}

// ---------- Reef branch ----------
{
  const { x, y, top } = POST
  const coupler = 58
  put('reef.base', [x, y, 0.5], S(k.cylinder(x, y, 3.4, 0, 1, P, 40, 0.3), { tone: 'lo' }) + ringScrews(k.corners({ x: x - 3.4, y: y - 3.4, w: 6.8, d: 6.8 }, 1.5), 1, 0.45), [A.cylinder(x, y, 3.4, 0, 1, { name: 'reef.base' })])
  put('reef.post.low', [x, y, coupler / 2], S(k.cylinder(x, y, POST_R, 1, coupler - 1, P, 32), { tone: 'mid', crease: 'none' }), [A.cylinder(x, y, POST_R, 1, coupler - 1, { name: 'reef.post.low' })])
  put('reef.coupler', [x, y, coupler + 1], S(k.cylinder(x, y, POST_R + 0.35, coupler, 2, P, 32), { tone: 'mid' }) + Ln(k.sideArc(x, y, POST_R + 0.35, coupler + 1, P, 20), { tone: 'faint' }), [A.cylinder(x, y, POST_R + 0.35, coupler, 2, { name: 'reef.coupler' })])
  put('reef.post.high', [x, y, (coupler + 2 + top) / 2], S(k.cylinder(x, y, POST_R, coupler + 2, top - coupler - 2, P, 32), { tone: 'mid', crease: 'none' }), [A.cylinder(x, y, POST_R, coupler + 2, top - coupler - 2, { name: 'reef.post.high' })])
  put('reef.cap', [x, y, top + 0.3], S(k.cylinder(x, y, POST_R + 0.25, top, 0.6, P, 32), { tone: 'mid' }), [A.cylinder(x, y, POST_R + 0.25, top, 0.6, { name: 'reef.cap' })])
}

// Levers slot, recorded at home.
{
  const shapes = []
  for (let i = 0; i < LEVERS; i++) {
    const { F, s0, s1, collar, knob } = leverParts(i, 0)
    shapes.push(A.prism(F, BAR, s0, s1, { name: `lever.${i}` }))
    shapes.push(A.disc(F, collar[0], collar[1], collar[2], { name: `lever.${i}.collar` }))
    shapes.push(A.ball(knob[0], knob[1], { name: `lever.${i}.knob` }))
  }
  put('slot.levers', [LEVER.x0 + 6 * LEVER.pitch, LEVER.pivotY, 12], '', shapes, { slot: 'levers' })
}

// ---------- Order, audit, output ----------
const STAGE_SVG = innerStage(0)
finish(R, P, {
  name: 'superstructure',
  W,
  H,
  prefix,
  label: 'A signal-box lever frame wired to a bench model of the 2025 Iron Panthers elevator and pivot arm. Each of the 13 levers is a superstructure state. Pulling one sets the target; the frame works the route one lever at a time, and each lever lock releases only when the elevator and pivot both report they have arrived.',
  exports: { STAGE: STAGE_SVG },
  // Moving parts must keep these neighbours in every pose, not just at rest.
  mustFollow: [
    ['slot.strap', 'mast.outer.top'], ['slot.strap', 'mast.outer.left'], ['slot.strap', 'mast.outer.right'], ['slot.strap', 'mast.pulley'], ['slot.strap', 'mast.drum'],
    ['slot.stage', 'slot.strap'], ['slot.stage', 'mast.outer.bearing'],
    ['slot.arm', 'slot.stage'], ['slot.arm', 'hopper.back'], ['slot.arm', 'hopper.left.back'], ['slot.arm', 'hopper.right.back'],
    ['hopper.front', 'slot.arm'], ['hopper.left.front', 'slot.arm'], ['hopper.right.front', 'slot.arm'], ['reef.post.high', 'slot.arm'],
    ['slot.levers', 'frame.plate'], ...Array.from({ length: LEVERS }, (_, i) => ['slot.levers', `frame.lock.${i}`]), ['slot.levers', 'frame.board'],
  ],
  preview: () => {
    const pose = { e: 0.6, theta: PIVOT.STOW, servo: TONGUE.STOW }
    const pullOf = (i) => (STATES[i] === 'STOW' ? 1 : 0)
    const levers = Array.from({ length: LEVERS }, (_, i) => i)
      .sort((a, b) => G.dot3(leverParts(a, pullOf(a)).knob[0], V) - G.dot3(leverParts(b, pullOf(b)).knob[0], V))
      .map((i) => leverSvg(i, pullOf(i), { lit: STATES[i] === 'STOW' }))
      .join('')
    return {
      slots: { strap: strapSvg(pose.e), stage: `<g transform="${k.translateAlong(P, [0, 0, pose.e])}">${STAGE_SVG}</g>`, arm: armSvg(pose.theta, pose.servo, pose.e), levers },
      plate: { fig: '// fig 06', title: 'superstructure interlock', hint: 'pull a lever', readout: 'stow · 0.6 in · -96°' },
    }
  },
})
