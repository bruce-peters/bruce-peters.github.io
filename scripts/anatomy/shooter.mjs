// The 2026 shoot-on-the-move figure: a scale field on a bench, the hub at
// the back, and a swerve robot that drives across the front and keeps scoring.
// The robot and the fuel in flight move, so they are one slot here; the page
// draws them every frame with src/anatomy/shooter/scene.js.
import * as k from '../../src/anatomy/kit/iso-kit.mjs'
import * as G from '../../src/anatomy/kit/lathe.mjs'
import * as A from '../../src/anatomy/kit/audit.mjs'
import { workshop, finish } from './common.mjs'
import { W, H, P, at, BASE, BASE_H, FOOT_H, CARPET_H, HUB, PATH, robotSvg, exitPoint, arcOf, ballSvg, trailOf } from '../../src/anatomy/shooter/scene.js'
import { solve } from '../../src/anatomy/shooter/model.js'

const { R, S, Ln, Dots, seg, put, box, ringScrews } = workshop(P)
const up = [0, 0, 1]
const Z = CARPET_H

// ---------- Bench and carpet ----------
const prefix = [`<path class="iso-halo" d="${k.haloOf(BASE, -BASE_H - FOOT_H, BASE_H, P)}"/>`]
for (const [x, y] of k.corners(BASE, 26)) {
  const z0 = -BASE_H - FOOT_H
  put('stand.foot', [x, y, z0 + FOOT_H / 2], S(k.cylinder(x, y, 9, z0, 2, P, 28), { tone: 'lo' }) + S(k.cylinder(x, y, 7, z0 + 2, FOOT_H - 2, P, 28), { tone: 'mid' }),
    [A.cylinder(x, y, 9, z0, 2, { name: 'stand.foot.pad' }), A.cylinder(x, y, 7, z0 + 2, FOOT_H - 2, { name: 'stand.foot' })])
}
{
  const carpet = k.insetPlan(BASE, 8)
  const lines = []
  // Tape: a line across the field and a square round the hub.
  lines.push(S(k.slabOf({ x: -60, y: carpet.y, w: 5, d: carpet.d, r: 0 }, Z, 0.3, P, 1), { tone: 'lo', crease: 'none' }))
  const zone = { x: HUB.x - 95, y: HUB.y - 80, w: 190, d: 160, r: 0 }
  for (const t of [
    { x: zone.x, y: zone.y, w: zone.w, d: 5 }, { x: zone.x, y: zone.y + zone.d - 5, w: zone.w, d: 5 },
    { x: zone.x, y: zone.y + 5, w: 5, d: zone.d - 10 },
  ]) lines.push(S(k.slabOf({ ...t, r: 0 }, Z, 0.3, P, 1), { tone: 'lo', crease: 'none' }))
  const ruler = { x: carpet.x + 10, y: BASE.y + BASE.d - 7, w: 400, d: 5, r: 0.6 }
  const ticks = k.topTicks(ruler.x, ruler.x + ruler.w, 25, 4, ruler.y + 0.6, Z + 0.4, [2.2, 4], P)
  const svg =
    S(k.slabOf(BASE, -BASE_H, BASE_H, P, 8, 1.6), { tone: 'mid' }) +
    ringScrews(k.corners(BASE, 5), 0, 2) +
    S(k.slabOf(carpet, 0, Z, P, 8, 0.6), { tone: 'lo' }) +
    Ln(k.planOutline(k.insetPlan(carpet, 6), Z, P), { tone: 'faint' }) +
    lines.join('') +
    S(k.slabOf(ruler, Z, 0.4, P, 3), { tone: 'mid', crease: 'none' }) + Ln(ticks.minor, { tone: 'lo' }) + Ln(ticks.major, { tone: 'hi' })
  put('stand.bench', [0, 0, -BASE_H / 2], svg, [A.slab(BASE, -BASE_H, BASE_H + Z, { name: 'stand.bench' })], { key: -1e6 })
}

// ---------- Field walls along the back and right edges ----------
{
  const t = 2
  const h = 48
  const back = { x: BASE.x + 8, y: BASE.y + 8, w: BASE.w - 16, d: t, r: 0 }
  const right = { x: BASE.x + BASE.w - 8 - t, y: BASE.y + 8 + t, w: t, d: BASE.d - 16 - t, r: 0 }
  const left = { x: BASE.x + 8, y: BASE.y + 8 + t, w: t, d: BASE.d - 16 - t, r: 0 }
  void right
  box('wall.back', back, Z, Z + h, { tone: 'lo' }, { steps: 1, inner: Ln(k.sideSeam(back, Z + h - 8, P, 1), { tone: 'faint' }) })
  box('wall.left', left, Z, Z + h, { tone: 'lo' }, { steps: 1, inner: Ln(k.sideSeam(left, Z + h - 8, P, 1), { tone: 'faint' }) })
  for (let x = back.x + 100; x < back.x + back.w - 20; x += 100) box('wall.post', { x: x - 2, y: back.y + t, w: 4, d: 3, r: 0.4 }, Z, Z + h + 2, {}, { steps: 2 })
  for (let y = left.y + 90; y < left.y + left.d - 20; y += 90) box('wall.post', { x: left.x + t, y: y - 2, w: 3, d: 4, r: 0.4 }, Z, Z + h + 2, {}, { steps: 2 })
}

// ---------- The hub ----------
{
  const hex = Array.from({ length: 6 }, (_, i) => [Math.cos((i * 60 + 30) * Math.PI / 180) * HUB.r, Math.sin((i * 60 + 30) * Math.PI / 180) * HUB.r])
  const F = G.frameOf([HUB.x, HUB.y, Z], up, [1, 0, 0], [0, 1, 0])
  const plinth = hex.map(([x, y]) => [x * 1.08, y * 1.08])
  put('hub.plinth', [HUB.x, HUB.y, Z + 2], S(G.prismOf(F, plinth, 0, 4, P), { tone: 'lo' }), [A.prism(F, plinth, 0, 4, { name: 'hub.plinth' })])
  const ring = hex.map(([x, y]) => [HUB.x + x, HUB.y + y])
  const bands = [50, 100].map((z) => k.ringSeam(ring, Z + 4 + z, P)).join('')
  // AprilTags on the two faces that look toward the field.
  const tags = []
  for (const i of [1, 2]) {
    const [x0, y0] = hex[i]
    const [x1, y1] = hex[(i + 1) % 6]
    const mid = [HUB.x + (x0 + x1) / 2, HUB.y + (y0 + y1) / 2]
    const along = [(x1 - x0) / HUB.r, (y1 - y0) / HUB.r]
    const n = [Math.cos(((i + 1) * 60) * Math.PI / 180), Math.sin(((i + 1) * 60) * Math.PI / 180)]
    const p = (u, z, out = 0.4) => at([mid[0] + along[0] * u + n[0] * out, mid[1] + along[1] * u + n[1] * out, z])
    const z0 = Z + 104
    const sq = (h, z) => k.pathOf([p(-h, z - h), p(h, z - h), p(h, z + h), p(-h, z + h)], true)
    tags.push(`<path class="an-glass" d="${sq(8.25, z0)}"/>`, Ln(sq(8.25, z0), { tone: 'lo' }), Ln(sq(5.2, z0), { tone: 'mid' }), Ln(sq(2.4, z0 + 1.2), { tone: 'mid' }))
  }
  const body = G.prismOf(F, hex, 4, 4 + HUB.body, P)
  put('hub.body', [HUB.x, HUB.y, Z + 4 + HUB.body / 2], S(body, { tone: 'mid', inner: Ln(bands, { tone: 'faint' }) }) + tags.join(''), [A.prism(F, hex, 4, 4 + HUB.body, { name: 'hub.body' })])
  // Funnel up to the mouth, 1.83 m above the carpet.
  const FF = G.frameOf([HUB.x, HUB.y, Z + 4 + HUB.body], up, [1, 0, 0], [0, 1, 0])
  const rise = HUB.entry - (4 + HUB.body)
  const funnel = G.solidOf([[0, HUB.r * 0.8], [rise, HUB.mouth + 2]], FF, P)
  const mouth = G.circleOf(FF, rise + 0.01, HUB.mouth, P)
  put('hub.funnel', [HUB.x, HUB.y, Z + HUB.entry - rise / 2], S(funnel, { tone: 'mid' }) + `<path class="an-void" d="${mouth}"/>` + Ln(mouth, { tone: 'lo' }) +
    Dots(G.dotsOf(FF, rise, HUB.mouth + 1, 12, P, { all: true }), { size: 0.4 }),
    [A.solid(FF, [[0, HUB.r * 0.8], [rise, HUB.mouth + 2]], { name: 'hub.funnel' })])
}

// ---------- Label plate with the maker's pill ----------
{
  const plate = { x: BASE.x + BASE.w - 118, y: BASE.y + BASE.d - 44, w: 92, d: 28, r: 2 }
  const rules = [[8, 60], [13, 44], [18, 52]].map(([dy, len]) => Ln(k.lineOnTop([plate.x + 8, plate.y + dy], [plate.x + 8 + len, plate.y + dy], Z + 1.2, P), { tone: 'lo', free: true }))
  const cx = plate.x + plate.w - 15
  const cy = plate.y + plate.d / 2
  const pillF = G.frameOf([cx, cy, Z + 1.2], up, [1, 0, 0], [0, 1, 0])
  const pill = G.stadium(4, 4, 14, 24).map(([u, v]) => [u - 7, v])
  const mark = `<g transform="${k.topMatrix([cx, cy], Z + 1.7, P, 'x')}"><text class="an-mark" x="0" y="1.6" font-size="4.6" text-anchor="middle"><tspan class="an-slash">/</tspan>bp<tspan class="an-slash">/</tspan></text></g>`
  box('plate', plate, Z, Z + 1.2, { tone: 'lo' }, { steps: 4, extra: Ln(k.planOutline(k.insetPlan(plate, 2.5), Z + 1.2, P, 4), { tone: 'faint' }) + rules.join('') + Dots([at([plate.x + 4, plate.y + 4, Z + 1.2]), at([plate.x + 4, plate.y + plate.d - 4, Z + 1.2])], { size: 0.45 }) })
  put('plate.pill', [cx, cy, Z + 1.45], S(G.prismOf(pillF, pill, 0, 0.5, P), { tone: 'mid' }) + mark, [A.prism(pillF, pill, 0, 0.5, { name: 'plate.pill' })])
}

// ---------- Slot: robot and fuel ----------
put('slot.world', [0, PATH.y, 30], '', [A.box([PATH.from - 39, PATH.y - 39, Z], [PATH.to + 39, PATH.y + 39, Z + 70], { name: 'slot.world' })], { slot: 'world' })

finish(R, P, {
  name: 'shooter',
  W,
  H,
  prefix,
  label: 'A scale model of the 2026 field on a bench. A swerve robot drives across the front while it shoots fuel into the hub at the back. It points its whole drivebase upstream of the hub and changes its hood angle and flywheel speed, so each shot lands while the robot is still moving.',
  mustFollow: [['slot.world', 'hub.funnel'], ['slot.world', 'hub.body'], ['slot.world', 'wall.back']],
  preview: () => {
    const x = -40
    const s = solve([x / 100, PATH.y / 100], [1.5, 0], [HUB.x / 100, HUB.y / 100])
    const exit = exitPoint(x, PATH.y, s.heading, s.hood)
    const arc = arcOf(exit, s.distance)
    const balls = [0.25, 0.5, 0.75].map((u) => ballSvg(arc.at(u * arc.tof))).join('')
    return {
      slots: { world: k.lineSvg(trailOf(arc), { tone: 'lit', dotted: true }) + balls + robotSvg({ x, y: PATH.y, heading: s.heading, wheelYaw: 0, hood: s.hood, firing: true }) },
      plate: { fig: '// fig 01', title: 'shoot on the move', hint: 'hover to drive', readout: `${s.distance.toFixed(1)} m · 1.5 m/s · lead ${Math.abs(s.lead).toFixed(0)}° · hood ${s.hood.toFixed(0)}°` },
    }
  },
})
