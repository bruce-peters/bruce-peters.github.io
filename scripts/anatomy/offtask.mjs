// The off-task detection figure: one feeder of one-second clips, two lines.
// The short line (back) is the pretrained image model plus a small head; the
// long line (front) is five sensor stations, a 96-feature manifold and a
// classifier. Each line ends at a gauge reading the paper's balanced
// accuracy; a switch picks the lesson context. The clips, needles and switch
// pointer move, so they are slots.
import * as k from '../../src/anatomy/kit/iso-kit.mjs'
import * as G from '../../src/anatomy/kit/lathe.mjs'
import * as A from '../../src/anatomy/kit/audit.mjs'
import { workshop, finish } from './common.mjs'
import {
  W, H, P, at, BENCH, BENCH_H, FOOT_H, BELT, LINES, LEG_Z, STATIONS, GAUGE_X, GAUGES, GAUGE_R, SWEEP, FEEDER, SWITCH, SWITCH_STOPS,
  tokenSvg, needleAngle, needlePath, gaugeFace, switchAngle, switchPointer,
} from '../../src/anatomy/offtask/scene.js'
import { MODELS, SCALE } from '../../src/anatomy/offtask/model.js'

const { R, S, Ln, Dots, put, box, ringScrews } = workshop(P)
const DEG = Math.PI / 180
const RAIL = 1.2
const RAIL_Z = [5, 10]

// ---------- Bench ----------
const prefix = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`]
for (const [x, y] of k.corners(BENCH, 16)) {
  const z0 = -BENCH_H - FOOT_H
  put('stand.foot', [x, y, z0 + FOOT_H / 2], S(k.cylinder(x, y, 6, z0, 1.5, P, 28), { tone: 'lo' }) + S(k.cylinder(x, y, 4.6, z0 + 1.5, FOOT_H - 1.5, P, 28), { tone: 'mid' }),
    [A.cylinder(x, y, 6, z0, 1.5, { name: 'stand.foot.pad' }), A.cylinder(x, y, 4.6, z0 + 1.5, FOOT_H - 1.5, { name: 'stand.foot' })])
}
put('stand.bench', [0, 0, -BENCH_H / 2],
  S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.4), { tone: 'mid' }) + Ln(k.planOutline(k.insetPlan(BENCH, 4), 0, P), { tone: 'faint' }) + ringScrews(k.corners(BENCH, 7), 0, 1.5),
  [A.slab(BENCH, -BENCH_H, BENCH_H, { name: 'stand.bench' })], { key: -1e6 })

// Label plate with the maker's pill, front left.
{
  const plate = { x: BENCH.x + 12, y: BENCH.y + BENCH.d - 15, w: 40, d: 10, r: 1 }
  const rules = [[3.2, 18], [5.4, 12], [7.4, 15]].map(([dy, len]) => Ln(k.lineOnTop([plate.x + 3, plate.y + dy], [plate.x + 3 + len, plate.y + dy], 0.8, P), { tone: 'lo', free: true }))
  box('plate', plate, 0, 0.8, { tone: 'lo' }, { steps: 4, extra: Ln(k.planOutline(k.insetPlan(plate, 1.2), 0.8, P, 4), { tone: 'faint' }) + rules.join('') })
  const cx = plate.x + plate.w - 9
  const cy = plate.y + plate.d / 2
  const F = G.frameOf([cx, cy, 0.8], [0, 0, 1], [1, 0, 0], [0, 1, 0])
  const pill = G.stadium(2.2, 2.2, 8, 24).map(([u, v]) => [u - 4, v])
  const mark = `<g transform="${k.topMatrix([cx, cy], 1.15, P, 'x')}"><text class="an-mark" x="0" y="0.9" font-size="2.5" text-anchor="middle"><tspan class="an-slash">/</tspan>bp<tspan class="an-slash">/</tspan></text></g>`
  put('plate.pill', [cx, cy, 1], S(G.prismOf(F, pill, 0, 0.35, P), { tone: 'mid' }) + mark, [A.prism(F, pill, 0, 0.35, { name: 'plate.pill' })], { bias: 0.2 })
}

// ---------- Feeder: a reel of one-second clips feeding both lines ----------
{
  const f = FEEDER
  const face = f.x + f.w
  const mouths = Object.values(LINES).map((y) => k.pathOf([[face + 0.01, y - BELT.half, BELT.z - 1], [face + 0.01, y + BELT.half, BELT.z - 1], [face + 0.01, y + BELT.half, BELT.z + 3], [face + 0.01, y - BELT.half, BELT.z + 3]].map(at), true)).join('')
  box('feeder', f, 0, f.top, {}, { steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(f, f.top - 3, P, 3), { tone: 'faint' }), extra: Ln(mouths, { tone: 'lo' }) + Dots(k.corners(f, 2).map(([x, y]) => at([x, y, f.top])), { size: 0.4 }) })
  // The reel stands on top in a cradle, its axle along y.
  const cx = f.x + f.w / 2
  const cradle = { x: cx - 5, y: f.y + f.d / 2 - 4, w: 10, d: 8, r: 0.6 }
  box('feeder.cradle', cradle, f.top, f.top + 2, {}, { steps: 2, bevel: 0.2 })
  const RF = G.frameAlong([cx, f.y + f.d / 2 - 2.8, f.top + 2 + 9.5], [0, 1, 0])
  const reel = S(G.disc(0, 5, 9.5, RF, P, { steps: 64 }), { tone: 'lo' }) + S(G.disc(5, 5.6, 10, RF, P, { steps: 64 }), { tone: 'mid' }) +
    Ln(G.circleOf(RF, 5.6, 3.2, P, 32), { tone: 'lo' }) + Dots(G.dotsOf(RF, 5.6, 6.6, 6, P, { all: true }), { size: 0.45, tone: 'mid' })
  put('feeder.reel', [cx, f.y + f.d / 2, f.top + 11.5], reel, [A.disc(RF, 0, 5, 9.5, { name: 'feeder.reel', owner: 'reel' }), A.disc(RF, 5, 5.6, 10, { name: 'feeder.reel.flange', owner: 'reel' })])
}

// ---------- Conveyors ----------
for (const [line, y] of Object.entries(LINES)) {
  const from = FEEDER.x + FEEDER.w
  const len = BELT.to - from
  const back = { x: from, y: y - BELT.half - RAIL, w: len, d: RAIL, r: 0.2 }
  const front = { x: from, y: y + BELT.half, w: len, d: RAIL, r: 0.2 }
  const belt = { x: from, y: y - BELT.half, w: len, d: BELT.half * 2, r: 0 }
  box(`belt.${line}.rail.back`, back, RAIL_Z[0], RAIL_Z[1], {}, { steps: 1 })
  box(`belt.${line}.surface`, belt, BELT.z - 1.4, BELT.z, { tone: 'lo', crease: 'none' }, { steps: 1 })
  box(`belt.${line}.rail.front`, front, RAIL_Z[0], RAIL_Z[1], {}, { steps: 1, extra: Dots([0.2, 0.5, 0.8].map((t) => at([from + len * t, front.y + RAIL + 0.01, 7.5])), { size: 0.35 }) })
  for (const lx of [from + 18, from + len / 2, BELT.to - 8]) {
    for (const ly of [back.y + RAIL / 2, front.y + RAIL / 2]) box(`belt.${line}.leg`, { x: lx - 1.2, y: ly - 0.6, w: 2.4, d: 1.2, r: 0.1 }, 0, RAIL_Z[0], {}, { steps: 1 })
  }
  // End roller across the belt, and the tray that catches the clips.
  const RF = G.frameAlong([BELT.to + 1.7, back.y, BELT.z - 1.7], [0, 1, 0])
  put(`belt.${line}.roller`, [BELT.to + 1.7, y, BELT.z - 1.7], S(G.disc(0, BELT.half * 2 + RAIL * 2, 1.7, RF, P, { steps: 24 }), { tone: 'mid' }), [A.disc(RF, 0, BELT.half * 2 + RAIL * 2, 1.7, { name: `belt.${line}.roller` })])
  const tray = { x: BELT.to + 3.6, y: y - BELT.half - 1, w: 11, d: BELT.half * 2 + 2, r: 0.8 }
  box(`tray.${line}`, tray, 0, 6, { tone: 'lo' }, { steps: 2, bevel: 0.3, extra: `<path class="an-void" d="${k.onTop(k.ringOf(k.insetPlan(tray, 1), 2), 6, P, true)}"/>` + Ln(k.planOutline(k.insetPlan(tray, 1), 6, P, 2), { tone: 'mid' }) })
}

// ---------- Stations ----------
function station(line, s) {
  const y = LINES[line]
  const legY = [y - BELT.half - RAIL - 2.6, y + BELT.half + RAIL]
  const legXs = s.w > 18 ? [s.x - s.w / 2 + 3, s.x + s.w / 2 - 3] : [s.x]
  const name = `st.${line}.${s.key}`
  for (const lx of legXs) {
    box(`${name}.legback`, { x: lx - 1.6, y: legY[0], w: 3.2, d: 2.6, r: 0.3 }, 0, LEG_Z, {}, { steps: 1 })
    box(`${name}.legfront`, { x: lx - 1.6, y: legY[1], w: 3.2, d: 2.6, r: 0.3 }, 0, LEG_Z, {}, { steps: 1 })
  }
  const head = { x: s.x - s.w / 2, y: legY[0] - 0.6, w: s.w, d: legY[1] + 2.6 + 0.6 - (legY[0] - 0.6), r: 1 }
  const top = LEG_Z + s.h
  const zt = top
  // The status lamp on the front face, lit while a clip is under the station.
  const LF = G.frameAlong([s.x + s.w / 2 - 2.6, head.y + head.d, top - 2.4], [0, 1, 0])
  let extra = S(G.disc(0, 0.6, 1.1, LF, P, { steps: 18 }), { tone: 'mid' }) + `<path class="an-lens" data-station="${line}.${s.key}" d="${G.circleOf(LF, 0.61, 0.7, P, 16)}"/>`
  const shapes = [A.disc(LF, 0, 0.6, 1.1, { name: `${name}.lamp`, owner: name })]
  if (s.key === 'model') {
    // The pretrained image model: a big plain box with one wide aperture.
    const AF = G.frameAlong([s.x - 4, head.y + head.d, LEG_Z + s.h / 2], [0, 1, 0])
    extra += S(G.disc(0, 1.2, 5.6, AF, P, { steps: 48 }), { tone: 'mid' }) + S(G.disc(1.2, 2, 4.4, AF, P, { steps: 48 }), { tone: 'hi' }) + Ln(G.circleOf(AF, 2, 2.6, P, 32), { tone: 'mid' })
    shapes.push(A.disc(AF, 0, 1.2, 5.6, { name: `${name}.aperture`, owner: name }), A.disc(AF, 1.2, 2, 4.4, { name: `${name}.lens`, owner: name }))
    extra += Ln(Array.from({ length: 6 }, (_, j) => k.planOutline({ x: s.x + 2 + j * 2, y: head.y + 2, w: 1, d: head.d - 4, r: 0.5 }, zt, P, 3)).join(''), { tone: 'lo' })
  } else if (s.key === 'head' || s.key === 'classifier') {
    extra += Ln(k.planOutline(k.insetPlan(head, 2), zt, P, 3), { tone: 'faint' })
  } else if (s.key === 'gaze') {
    const EF = G.frameAlong([s.x - 2, head.y + head.d, LEG_Z + s.h / 2], [0, 1, 0])
    extra += S(G.disc(0, 1, 2.6, EF, P, { steps: 32 }), { tone: 'mid' }) + Ln(G.circleOf(EF, 1.01, 1.6, P, 24), { tone: 'lo' }) + Dots([at(G.pointOf(EF, 1.02, 0, 0))], { size: 0.6, tone: 'hi' })
    shapes.push(A.disc(EF, 0, 1, 2.6, { name: `${name}.eye`, owner: name }))
  } else if (s.key === 'headpose') {
    const g = [s.x - 1.5, head.y + head.d / 2]
    extra += S(k.cylinder(g[0], g[1], 1.2, zt, 2.4, P, 16), { tone: 'mid' }) + Ln(k.ring(g[0], g[1], 3.4, zt + 0.01, P, 32) + k.ring(g[0], g[1], 2.2, zt + 0.01, P, 24), { tone: 'mid' }) +
      S(G.sphereOf([g[0], g[1], zt + 3.4], 1, P, { steps: 20 }), { tone: 'hi' })
    shapes.push(A.cylinder(g[0], g[1], 1.2, zt, 2.4, { name: `${name}.gimbal`, owner: name }), A.ball([g[0], g[1], zt + 3.4], 1, { name: `${name}.ball`, owner: name }))
  } else if (s.key === 'pose') {
    // A two-link arm on top, joints as dots.
    const j = [[s.x - 4, head.y + 3], [s.x - 1, head.y + head.d - 3.5], [s.x + 2.5, head.y + 4]]
    extra += Ln(k.onTop(j, zt, P), { tone: 'mid' }) + Dots(j.map(([x, yy]) => at([x, yy, zt])), { size: 0.55, tone: 'hi' })
  } else if (s.key === 'objects') {
    const b = { x: s.x - 4.5, y: head.y + 2.5, w: 7, d: head.d - 5, r: 0 }
    extra += Ln(k.planOutline(b, zt, P, 1), { tone: 'mid' }) + Dots(k.corners(b, 0).map(([x, yy]) => at([x, yy, zt])), { size: 0.5, tone: 'hi' })
  } else if (s.key === 'speech') {
    const m = [s.x - 1.5, head.y + head.d / 2]
    extra += S(k.cylinder(m[0], m[1], 1.1, zt, 3, P, 16), { tone: 'mid' }) + S(k.cylinder(m[0], m[1], 2, zt + 3, 2.6, P, 24), { tone: 'mid' }) +
      Ln(k.knurl(m[0], m[1], 2, zt + 3, zt + 5.6, 14, P, 0), { tone: 'lo' })
    shapes.push(A.cylinder(m[0], m[1], 1.1, zt, 3, { name: `${name}.stem`, owner: name }), A.cylinder(m[0], m[1], 2, zt + 3, 2.6, { name: `${name}.mic`, owner: name }))
  } else if (s.key === 'features') {
    // 96 features, one pin each: 12 by 8 on the top.
    const pins = []
    for (let c = 0; c < 12; c++) for (let r = 0; r < 8; r++) pins.push(at([s.x - s.w / 2 + 2.2 + c * ((s.w - 4.4) / 11), head.y + 2 + r * ((head.d - 4) / 7), zt]))
    extra += Dots(pins, { size: 0.42, tone: 'mid' })
  }
  box(`${name}.head`, head, LEG_Z, top, {}, { steps: 2, bevel: 0.4, inner: Ln(k.sideSeam(head, LEG_Z + 1.6, P, 2), { tone: 'faint' }), extra })
  for (const sh of shapes) R.solid(sh)
  return name
}
const stationNames = { back: STATIONS.back.map((s) => station('back', s)), front: STATIONS.front.map((s) => station('front', s)) }

// ---------- Gauges ----------
for (const [line, g] of Object.entries(GAUGES)) {
  const face = gaugeFace(line)
  const postTop = g.z - GAUGE_R - 1.5
  box(`gauge.${line}.base`, { x: GAUGE_X - 5, y: g.y - 3, w: 10, d: 6, r: 1 }, 0, 1.2, { tone: 'lo' }, { steps: 3, bevel: 0.3 })
  put(`gauge.${line}.post`, [GAUGE_X, g.y, postTop / 2], S(k.cylinder(GAUGE_X, g.y, 1.3, 1.2, postTop - 1.2 + 0.2, P, 16), { tone: 'mid' }), [A.cylinder(GAUGE_X, g.y, 1.3, 1.2, postTop - 1.2 + 0.2, { name: `gauge.${line}.post` })])
  const F = G.frameAlong([GAUGE_X, g.y - 2, g.z], [0, 1, 0])
  const bodyLen = face - (g.y - 2)
  const body = S(G.disc(0, bodyLen - 0.1, GAUGE_R + 1.5, F, P, { steps: 64 }), { tone: 'mid' }) + S(G.disc(bodyLen - 0.1, bodyLen, GAUGE_R, F, P, { steps: 64 }), { tone: 'lo', crease: 'none' })
  const plane = k.sideMatrix([GAUGE_X, face + 0.01], g.z, P, 'left')
  const ticks = []
  for (let j = 0; j <= 30; j++) {
    const a = needleAngle(SCALE[0] + j * 0.01) * DEG
    const r0 = GAUGE_R - 1.4
    const r1 = j % 5 === 0 ? GAUGE_R - 3.4 : GAUGE_R - 2.4
    ticks.push({ d: `M${(Math.cos(a) * r0).toFixed(2)} ${(Math.sin(a) * r0).toFixed(2)}L${(Math.cos(a) * r1).toFixed(2)} ${(Math.sin(a) * r1).toFixed(2)}`, major: j % 5 === 0, chance: j === 0 })
  }
  const a0 = SWEEP[0] * DEG
  const a1 = SWEEP[1] * DEG
  const ar = GAUGE_R - 1.4
  const arc = `M${(Math.cos(a0) * ar).toFixed(2)} ${(Math.sin(a0) * ar).toFixed(2)}A${ar} ${ar} 0 0 1 ${(Math.cos(a1) * ar).toFixed(2)} ${(Math.sin(a1) * ar).toFixed(2)}`
  const scale = `<g transform="${plane}">` + Ln(arc, { tone: 'mid' }) + Ln(ticks.filter((t) => !t.major).map((t) => t.d).join(''), { tone: 'lo' }) +
    Ln(ticks.filter((t) => t.major && !t.chance).map((t) => t.d).join(''), { tone: 'mid' }) + Ln(ticks.filter((t) => t.chance).map((t) => t.d).join(''), { tone: 'hi' }) + '</g>'
  put(`gauge.${line}`, [GAUGE_X, (g.y - 2 + face) / 2, g.z], body + scale, [A.disc(F, 0, bodyLen, GAUGE_R + 1.5, { name: `gauge.${line}` })])
  put(`slot.needle.${line}`, [GAUGE_X, face + 0.5, g.z], '', [A.box([GAUGE_X - 8, face, g.z - 3], [GAUGE_X + 8, face + 0.1, g.z + 8], { name: `slot.needle.${line}`, ground: true })], { slot: `needle_${line}` })
}

// ---------- Lesson switch ----------
{
  const dots = Array.from({ length: SWITCH_STOPS }, (_, i) => {
    const a = switchAngle(i) * DEG
    return at([SWITCH.x + Math.sin(a) * (SWITCH.r + 2), SWITCH.y - Math.cos(a) * (SWITCH.r + 2), 0.6])
  })
  put('switch', [SWITCH.x, SWITCH.y, 1.8],
    S(k.cylinder(SWITCH.x, SWITCH.y, SWITCH.r + 3.2, 0, 0.6, P, 48), { tone: 'lo' }) + Dots(dots, { size: 0.5, tone: 'hi' }) +
      S(k.cylinder(SWITCH.x, SWITCH.y, SWITCH.r, 0.6, 3, P, 48, 0.4), { tone: 'mid' }) + Ln(k.knurl(SWITCH.x, SWITCH.y, SWITCH.r, 0.6, 3.6, 36, P, 0), { tone: 'lo' }) +
      Dots([at([SWITCH.x, SWITCH.y, 3.6])], { size: 0.7, tone: 'hi' }),
    [A.cylinder(SWITCH.x, SWITCH.y, SWITCH.r + 3.2, 0, 0.6, { name: 'switch.base' }), A.cylinder(SWITCH.x, SWITCH.y, SWITCH.r, 0.6, 3, { name: 'switch.knob' })])
  put('slot.pointer', [SWITCH.x, SWITCH.y, 3.7], '', [A.box([SWITCH.x - 4, SWITCH.y - 4, 3.6], [SWITCH.x + 4, SWITCH.y + 4, 3.65], { name: 'slot.pointer' })], { slot: 'pointer' })
}

// ---------- Clips on the belts ----------
for (const [line, y] of Object.entries(LINES)) {
  put(`slot.tokens.${line}`, [0, y, BELT.z + 0.5], '', [A.box([FEEDER.x + FEEDER.w, y - 3.2, BELT.z], [BELT.to, y + 3.2, BELT.z + 1], { name: `slot.tokens.${line}`, ground: true })], { slot: `tokens_${line}` })
}

const order = []
for (const line of ['back', 'front']) {
  const t = `slot.tokens.${line}`
  order.push([t, `belt.${line}.surface`], [t, `belt.${line}.rail.back`], [`belt.${line}.rail.front`, t], [t, 'feeder'], [`tray.${line}`, t])
  for (const n of stationNames[line]) order.push([t, `${n}.legback`], [`${n}.legfront`, t], [`${n}.head`, t])
}
for (const n of stationNames.front) order.push([`${n}.head`, 'slot.tokens.back'])
order.push(['slot.needle.back', 'gauge.back'], ['slot.needle.front', 'gauge.front'], ['slot.pointer', 'switch'])

finish(R, P, {
  name: 'offtask',
  W,
  H,
  prefix,
  label: 'Two conveyor lines on a bench, fed one-second clips by the same reel. The short line at the back passes each clip under one pretrained image model and a small head. The long line at the front passes it under five sensor stations for gaze, head pose, body pose, objects and speech, then a manifold of 96 features and a classifier. Each line ends at a gauge reading balanced accuracy against the human coders, from chance at 0.5 to 0.8, and a switch picks the lesson context.',
  mustFollow: order,
  preview: () => {
    const tokens = (y) => [-90, -60, -30, 0, 30, 60].map((x) => tokenSvg(x, y)).join('')
    const needle = (line, i) => `<g transform="${k.sideMatrix([GAUGE_X, gaugeFace(line) + 0.05], GAUGES[line].z, P, 'left')}"><path class="iso-line" data-tone="${i === 0 ? 'lit' : 'hi'}" data-free="start" style="stroke-width:1.1" d="${needlePath(needleAngle(MODELS[i].scores[1]))}"/><circle r="1" class="an-hub"/></g>`
    return {
      slots: { tokens_back: tokens(LINES.back), tokens_front: tokens(LINES.front), needle_back: needle('back', 0), needle_front: needle('front', 1), pointer: switchPointer(switchAngle(1)) },
      plate: { fig: '// fig 03', title: 'short line, long line', hint: 'click to change lesson', readout: 'teacher instruction · 2,614 windows' },
    }
  },
})
