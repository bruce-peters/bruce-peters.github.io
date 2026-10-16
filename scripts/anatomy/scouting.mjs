// The 2026 scouting figure: a pneumatic tube station. Eight scout desks send
// their match reports as capsules up their tubes and along a header to the
// manager's receiver, whose eight lamps show which roles are in. The
// capsules, the qual desks' ranking cards, the tray and the match clock's
// hand move, so they are slots; the page draws them with
// src/anatomy/scouting/scene.js.
import * as k from '../../src/anatomy/kit/iso-kit.mjs'
import * as G from '../../src/anatomy/kit/lathe.mjs'
import * as A from '../../src/anatomy/kit/audit.mjs'
import { tubePieces, tubeSvg } from '../../src/anatomy/kit/tube.mjs'
import { workshop, finish } from './common.mjs'
import {
  W, H, P, at, BED, BED_H, FOOT_H, DESK, DESKS, FRONT_Y, COUNTER, KEYS, RACK, HEAD, TUBE_R, HEADER, COLLAR, CLAMP, deskRoute,
  RECEIVER, RFACE, LAMPS_Z, lampX, CLOCK, MATCH_WINDOW, TRAY, rackSvg, traySvg, clockHandSvg, clockAngle, capsulesSvg, tripOf,
} from '../../src/anatomy/scouting/scene.js'
import { PHASES, MATCH_SECONDS } from '../../src/anatomy/scouting/model.js'

const { R, S, Ln, Dots, put, box, ringScrews, facePlane } = workshop(P)

function tubeItems(id, route, r, { tone = 'mid', maxLength = 22, spacing = 1, gaps = [] } = {}) {
  R.route(id, route, r, { owner: id, gaps })
  tubePieces(route, r, P, { maxLength, spacing, gaps }).forEach((part, index) =>
    R.put({ name: `${id}:${index}`, at: part.mid, svg: tubeSvg(part, { tone }), route: id, chunk: index, shapes: [A.tube(part.points, part.radii)] }))
}
// A lamp on a face that looks along +y.
function lampY(x, y, z, attr, key, r = 1.2) {
  const F = G.frameAlong([x, y, z], [0, 1, 0])
  return { svg: S(G.disc(0, 0.6, r, F, P, { steps: 18 }), { tone: 'mid' }) + `<path class="an-lens" data-${attr}="${key}" d="${G.circleOf(F, 0.61, r * 0.66, P, 16)}"/>`, shape: A.disc(F, 0, 0.6, r, { name: `lamp.${key}` }) }
}
const band = (y, x0, x1, z0, z1, cls) => `<path class="${cls}" d="${k.pathOf([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(at), true)}"/>`

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
{
  const plate = { x: -20, y: BED.y + BED.d - 11, w: 40, d: 8, r: 1 }
  const rules = [[2.6, 18], [4.4, 12], [6.2, 15]].map(([dy, len]) => Ln(k.lineOnTop([plate.x + 3, plate.y + dy], [plate.x + 3 + len, plate.y + dy], 0.8, P), { tone: 'lo', free: true }))
  box('plate', plate, 0, 0.8, { tone: 'lo' }, { steps: 4, extra: Ln(k.planOutline(k.insetPlan(plate, 1.2), 0.8, P, 4), { tone: 'faint' }) + rules.join('') })
  const cx = plate.x + plate.w - 9
  const cy = plate.y + plate.d / 2
  const F = G.frameOf([cx, cy, 0.8], [0, 0, 1], [1, 0, 0], [0, 1, 0])
  const pill = G.stadium(2.1, 2.1, 8, 24).map(([u, v]) => [u - 4, v])
  const mark = `<g transform="${k.topMatrix([cx, cy], 1.15, P, 'x')}"><text class="an-mark" x="0" y="0.85" font-size="2.4" text-anchor="middle"><tspan class="an-slash">/</tspan>bp<tspan class="an-slash">/</tspan></text></g>`
  put('plate.pill', [cx, cy, 1], S(G.prismOf(F, pill, 0, 0.35, P), { tone: 'mid' }) + mark, [A.prism(F, pill, 0, 0.35, { name: 'plate.pill' })], { bias: 0.2 })
}

// ---------- Desks ----------
for (const desk of DESKS) {
  const p = desk.plan
  const page = lampY(desk.x - 7, FRONT_Y, 5.6, 'desk', desk.key)
  const stripe = band(FRONT_Y + 0.01, p.x + 1.2, p.x + p.w - 1.2, 1.4, 2.4, desk.alliance === 'red' ? 'an-red' : 'an-blue')
  box(`desk.${desk.key}`, p, 0, DESK.top, {}, {
    steps: 3, bevel: 0.4, inner: Ln(k.sideSeam(p, DESK.top - 1.6, P, 3), { tone: 'faint' }),
    extra: stripe + page.svg + Dots(k.corners(p, 1.6).map(([x, y]) => at([x, y, DESK.top])), { size: 0.38 }),
  })
  R.solid(page.shape)
  if (desk.kind === 'robot') {
    // Tally counter: window with the count, three keys on top.
    const c = { x: desk.x - COUNTER.w / 2, y: COUNTER.y, w: COUNTER.w, d: COUNTER.d, r: 0.8 }
    const face = c.y + c.d
    const z0 = DESK.top + 1.4
    const win = `<g transform="${facePlane(face)}"><rect class="an-glass" x="${desk.x - 4.2}" y="${-(z0 + 2.9)}" width="8.4" height="2.9"/>` +
      `<text class="an-text" data-count="${desk.key}" x="${desk.x}" y="${-(z0 + 0.6)}" font-size="2.3" text-anchor="middle">000</text></g>`
    box(`counter.${desk.key}`, c, DESK.top, DESK.top + COUNTER.h, {}, { steps: 2, bevel: 0.35, extra: win + Ln(k.sideSeam(c, DESK.top + 0.9, P, 2), { tone: 'faint' }) })
    for (const dx of KEYS) {
      const kx = desk.x + dx
      const ky = c.y + 3
      put('counter.key', [kx, ky, DESK.top + COUNTER.h + 0.6], S(k.cylinder(kx, ky, 1.25, DESK.top + COUNTER.h, 1.1, P, 20, 0.2), { tone: 'hi' }),
        [A.cylinder(kx, ky, 1.25, DESK.top + COUNTER.h, 1.1, { name: 'counter.key' })])
    }
  } else {
    // Ranking rack: a bar with three slots the cards stand in.
    const r = { x: desk.x - RACK.w / 2, y: RACK.y, w: RACK.w, d: RACK.d, r: 0.5 }
    const slots = [-1, 0, 1].map((i) => k.planOutline({ x: desk.x + i * RACK.gap - 2.1, y: RACK.y + RACK.d / 2 - 0.9, w: 4.2, d: 1.8, r: 0.2 }, DESK.top + RACK.h, P, 2)).join('')
    box(`rack.${desk.key}`, r, DESK.top, DESK.top + RACK.h, { tone: 'lo' }, { steps: 2, bevel: 0.2, extra: Ln(slots, { tone: 'faint' }) })
  }
  // Dispatch head: a socket with a lip, where the capsule goes in.
  const [hx, hy] = desk.head
  put(`head.${desk.key}`, [hx, hy, DESK.top + 2.5],
    S(k.cylinder(hx, hy, HEAD.r + 0.6, DESK.top, 0.8, P, 28), { tone: 'lo' }) + S(k.cylinder(hx, hy, HEAD.r, DESK.top + 0.8, HEAD.top - DESK.top - 0.8, P, 28, 0.2), { tone: 'mid' }) +
      Ln(k.sideSeam({ x: hx - HEAD.r, y: hy - HEAD.r, w: HEAD.r * 2, d: HEAD.r * 2, r: HEAD.r }, HEAD.top - 1.4, P, 12), { tone: 'faint' }),
    [A.cylinder(hx, hy, HEAD.r + 0.6, DESK.top, 0.8, { name: `head.${desk.key}.lip` }), A.cylinder(hx, hy, HEAD.r, DESK.top + 0.8, HEAD.top - DESK.top - 0.8, { name: `head.${desk.key}` })])
}

// ---------- Header, collars, clamps on posts ----------
for (const side of [-1, 1]) {
  const id = `header.${side < 0 ? 'red' : 'blue'}`
  const x0 = side * HEADER.end
  const start = x0 - side * 1.6 // the cap's inner face
  const x1 = side * (HEADER.wall + HEADER.flange)
  const route = [[start, HEADER.y, HEADER.z], [x1, HEADER.y, HEADER.z]]
  const desks = DESKS.filter((d) => Math.sign(d.x) === side)
  const posts = [side * 117.5, side * 61.5] // midway between desk tubes
  const gapAt = (x, half) => [Math.abs(x - start) - half - 0.05, Math.abs(x - start) + half + 0.05]
  const gaps = [...desks.map((d) => gapAt(d.head[0], COLLAR.half)), ...posts.map((x) => gapAt(x, CLAMP.half))].sort((a, b) => a[0] - b[0])
  tubeItems(id, route, HEADER.r, { tone: 'mid', maxLength: 30, spacing: 1.5, gaps })
  // End cap; a clamp on each post; a collar with a flat boss where each desk tube joins.
  const capF = G.frameOf([x0, HEADER.y, HEADER.z], [-side, 0, 0], [0, 1, 0], [0, 0, 1])
  put('header.cap', [x0 - side * 0.6, HEADER.y, HEADER.z], S(G.disc(-0.4, 1.6, HEADER.r + 0.7, capF, P, { steps: 28 }), { tone: 'mid' }) + Dots([at([x0 + side * 1.6, HEADER.y, HEADER.z])], { size: 0.45, tone: 'hi' }),
    [A.disc(capF, -0.4, 1.6, HEADER.r + 0.7, { name: 'header.cap' })])
  for (const px of posts) {
    const F = G.frameOf([px, HEADER.y, HEADER.z], [1, 0, 0], [0, 1, 0], [0, 0, 1])
    const top = HEADER.z - CLAMP.r + 0.3
    put('header.post', [px, HEADER.y, top / 2],
      S(k.cylinder(px, HEADER.y, 3, 0, 1, P, 24), { tone: 'lo' }) + S(k.cylinder(px, HEADER.y, 1.1, 1, top - 1, P, 16), { tone: 'mid' }),
      [A.cylinder(px, HEADER.y, 3, 0, 1, { name: 'header.post.foot' }), A.cylinder(px, HEADER.y, 1.1, 1, top - 1, { name: 'header.post' })])
    put('header.clamp', [px, HEADER.y, HEADER.z], S(G.disc(-CLAMP.half, CLAMP.half, CLAMP.r, F, P, { steps: 28 }), { tone: 'mid' }) + Dots([at([px, HEADER.y + CLAMP.r * 0.7, HEADER.z + CLAMP.r * 0.7])], { size: 0.35 }),
      [A.disc(F, -CLAMP.half, CLAMP.half, CLAMP.r, { name: 'header.clamp', owner: id })])
  }
  for (const d of desks) {
    const hx = d.head[0]
    const F = G.frameOf([hx, HEADER.y, HEADER.z], [1, 0, 0], [0, 1, 0], [0, 0, 1])
    const boss = { x: hx - 1.9, y: HEADER.y + COLLAR.r - 1.2, w: 3.8, d: COLLAR.boss - COLLAR.r + 1.2, r: 0.3 }
    put(`collar.${d.key}`, [hx, HEADER.y, HEADER.z],
      S(G.disc(-COLLAR.half, COLLAR.half, COLLAR.r, F, P, { steps: 32 }), { tone: 'mid' }) + Ln(G.arcOf(F, -COLLAR.half + 0.8, COLLAR.r, P), { tone: 'faint' }) + Ln(G.arcOf(F, COLLAR.half - 0.8, COLLAR.r, P), { tone: 'faint' }) +
        S(k.slabOf(boss, HEADER.z - 1.9, 3.8, P, 1, 0.15), { tone: 'mid' }),
      [A.disc(F, -COLLAR.half, COLLAR.half, COLLAR.r, { name: `collar.${d.key}`, owner: id }), A.slab(boss, HEADER.z - 1.9, 3.8, { name: `collar.${d.key}.boss`, owner: id })])
  }
}
for (const desk of DESKS) tubeItems(`tube.${desk.key}`, deskRoute(desk), TUBE_R, { tone: 'mid' })

// ---------- Receiver ----------
{
  const r = RECEIVER
  const lamps = lampX
  const dial = (() => {
    const F = G.frameOf([CLOCK.x, RFACE, CLOCK.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
    const DF = G.frameOf([CLOCK.x, RFACE + 0.9, CLOCK.z], [0, 1, 0], [1, 0, 0], [0, 0, 1])
    const ticks = []
    const phase = []
    for (let s = 0; s < MATCH_SECONDS; s += 5) ticks.push(k.pathOf([at(G.pointOf(DF, 0.01, CLOCK.r - 0.9, clockAngle(s))), at(G.pointOf(DF, 0.01, CLOCK.r - 0.2, clockAngle(s)))]))
    for (const [s] of PHASES) phase.push(k.pathOf([at(G.pointOf(DF, 0.01, CLOCK.r - 2.2, clockAngle(s))), at(G.pointOf(DF, 0.01, CLOCK.r - 0.2, clockAngle(s)))]))
    return {
      svg: S(G.disc(0, 0.9, CLOCK.r + 0.9, F, P, { steps: 48 }), { tone: 'mid' }) + `<path class="an-glass" d="${G.circleOf(DF, 0, CLOCK.r, P, 48)}"/>` + Ln(ticks.join(''), { tone: 'lo' }) + Ln(phase.join(''), { tone: 'mid' }),
      shape: A.disc(F, 0, 0.9, CLOCK.r + 0.9, { name: 'receiver.clock' }),
    }
  })()
  const lampSet = Array.from({ length: 8 }, (_, i) => lampY(lamps(i), RFACE, LAMPS_Z, 'role', DESKS[i].key, 1.5))
  const ticks = Array.from({ length: 8 }, (_, i) => band(RFACE + 0.01, lamps(i) - 1.6, lamps(i) + 1.6, LAMPS_Z - 3.4, LAMPS_Z - 2.6, DESKS[i].alliance === 'red' ? 'an-red' : 'an-blue')).join('')
  const m = MATCH_WINDOW
  const win = `<g transform="${facePlane(RFACE)}"><rect class="an-glass" x="${m.x0}" y="${-m.z1}" width="${m.x1 - m.x0}" height="${m.z1 - m.z0}"/>` +
    `<text class="an-text" data-match="" x="${(m.x0 + m.x1) / 2}" y="${-m.z0 - 1.3}" font-size="3" text-anchor="middle">q1</text></g>`
  const chute = band(RFACE + 0.01, -11, 11, 9, 12.4, 'an-void')
  const vents = Array.from({ length: 7 }, (_, i) => k.planOutline({ x: r.x + 12 + i * 3, y: r.y + 6, w: 1.4, d: 14, r: 0.7 }, r.top, P, 3)).join('')
  box('receiver', r, 0, r.top, {}, {
    steps: 3, bevel: 0.6, inner: Ln(k.sideSeam(r, r.top - 3.4, P, 3), { tone: 'faint' }),
    extra: dial.svg + lampSet.map((l) => l.svg).join('') + ticks + win + chute + Ln(vents, { tone: 'lo' }) + ringScrews(k.corners(r, 2.6), r.top, 0.7),
  })
  ;[dial, ...lampSet].forEach((l) => R.solid(l.shape))
  // Flanges where the headers come in, one each side.
  for (const side of [-1, 1]) {
    const F = G.frameOf([side * HEADER.wall, HEADER.y, HEADER.z], [side, 0, 0], [0, 1, 0], [0, 0, 1])
    put('receiver.flange', [side * (HEADER.wall + 0.5), HEADER.y, HEADER.z], S(G.disc(-0.1, 1.1, HEADER.r + 1.6, F, P, { steps: 32 }), { tone: 'mid' }) + Dots(G.dotsOf(F, 1.1, HEADER.r + 1, 4, P, { all: true, phase: Math.PI / 4 }), { size: 0.35 }),
      [A.disc(F, -0.1, 1.1, HEADER.r + 1.6, { name: 'receiver.flange', owner: 'receiver' })])
  }
  // The tray the capsules drop into.
  box('receiver.tray', TRAY, TRAY.z0, TRAY.z1, {}, { steps: 2, bevel: 0.3, extra: `<path class="an-void" d="${k.pathOf([[TRAY.x + 1, TRAY.y + 0.5, TRAY.z1], [TRAY.x + TRAY.w - 1, TRAY.y + 0.5, TRAY.z1], [TRAY.x + TRAY.w - 1, TRAY.y + TRAY.d - 1, TRAY.z1], [TRAY.x + 1, TRAY.y + TRAY.d - 1, TRAY.z1]].map(at), true)}"/>` })
  box('receiver.tray.leg', { x: -1.5, y: TRAY.y + 3, w: 3, d: 3, r: 0.3 }, 0, TRAY.z0, { tone: 'lo' }, { steps: 1 })
}

// ---------- Slots ----------
const thin = (name, min, max) => [A.box(min, max, { name, ground: true })]
for (const desk of DESKS.filter((d) => d.kind === 'alliance')) {
  put(`slot.rack.${desk.key}`, [desk.x, RACK.y + 2, DESK.top + 4], '', thin(`slot.rack.${desk.key}`, [desk.x - 6, RACK.y + 1, DESK.top + RACK.h], [desk.x + 6, RACK.y + 2, DESK.top + RACK.h + 0.05]), { slot: `rack_${desk.key}` })
}
put('slot.tray', [0, TRAY.y + 4, TRAY.z1], '', thin('slot.tray', [TRAY.x + 2, TRAY.y + 2, TRAY.z1], [TRAY.x + TRAY.w - 2, TRAY.y + 6, TRAY.z1 + 0.05]), { slot: 'tray' })
put('slot.clock', [CLOCK.x, RFACE + 1, CLOCK.z], '', thin('slot.clock', [CLOCK.x - 3, RFACE + 0.92, CLOCK.z - 3], [CLOCK.x + 3, RFACE + 0.95, CLOCK.z + 3]), { slot: 'clock' })
put('slot.capsules', [0, 0, 60], '', thin('slot.capsules', [-1, -1, 70], [1, 1, 70.05]), { slot: 'capsules' })

const QUEUED = DESKS.filter((d) => d.key === 'blue2')
finish(R, P, {
  name: 'scouting',
  W,
  H,
  prefix,
  label:
    "A pneumatic tube station for the team's scouting app. Eight scout desks sit along the front: red 1 to 3 and blue 1 to 3 each follow one robot on a tally counter, and the two qual desks rank their alliance's three robots on a card rack. When the match clock runs out, each desk sends its report as a capsule up its tube and along the header to the manager's receiver, where that role's lamp lights as the capsule lands. A desk whose line is down keeps its capsule in the dispatch head and sends it when the line comes back.",
  mustFollow: [
    ...DESKS.filter((d) => d.kind === 'alliance').map((d) => [`slot.rack.${d.key}`, `rack.${d.key}`]),
    ['slot.tray', 'receiver.tray'], ['slot.clock', 'receiver'],
  ],
  last: ['slot.capsules'],
  preview: () => ({
    slots: {
      rack_qualRed: rackSvg(DESKS[3], [0, 1, 2]), rack_qualBlue: rackSvg(DESKS[4], [2, 0, 1]),
      tray: traySvg(5), clock: clockHandSvg(62),
      capsules: capsulesSvg(DESKS.filter((d) => ['red2', 'blue1'].includes(d.key)).map((d, i) => ({ trip: tripOf(d), s: 30 + i * 40 })), QUEUED),
    },
    plate: { fig: '// fig 05', title: 'eight scouts, one board', hint: 'click a desk', readout: 'q12 · 5 of 8 in · blue 2 queued' },
  }),
})
