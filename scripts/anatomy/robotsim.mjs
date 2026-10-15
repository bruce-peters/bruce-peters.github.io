// The robot simulation figure: the 2025 robot's real brain on a bench, wired
// through its motor controllers to stand-ins that are the physics the sim
// computes (a weight on a drum for the elevator, a pendulum for the pivot, a
// flywheel for the intake, swerve modules on floor pads, a camera facing an
// AprilTag board). A REAL / SIM / REPLAY switch (the code's Mode setting)
// picks what the brain is wired to. The stand-ins play the first 24 s of the
// Worlds Newton Q62 log as replayed through SIM-2025.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as k from '../../src/anatomy/kit/iso-kit.mjs'
import * as G from '../../src/anatomy/kit/lathe.mjs'
import * as A from '../../src/anatomy/kit/audit.mjs'
import { workshop, finish, ROOT } from './common.mjs'
import {
  W, H, P, at, BENCH, BENCH_H, FOOT_H, BRAIN, SCREEN, SWITCH, MODES, switchAngle, REEL, TRAY, CONTROLLERS, ELEVATOR, PIVOT, FLYWHEEL,
  SWERVE, MODULES, CAMERA, TAGBOARD, DRUM, weightSvg, drumMark, pendulumSvg, flywheelSpokes, swerveSvg, reelSpokes, switchPointer,
} from '../../src/anatomy/robotsim/scene.js'

const { R, S, Ln, Dots, put, box, ringScrews, facePlane, facePlaneX } = workshop(P)
const DEG = Math.PI / 180

// ---------- The trace: 24 s of the Worlds log, every 50 ms ----------
function trace() {
  const text = readFileSync(join(ROOT, 'public/wpilog/akit_25_sim.auto.csv'), 'utf8').trim().split('\n')
  const head = text[0].split(',')
  const col = (name) => head.indexOf(name)
  const rows = text.slice(1).map((line) => line.split(',')).filter((r) => r[col('elevator_z')] && r[col('pivot_qw')])
  const t = rows.map((r) => Number(r[col('t_s')]))
  const out = { dt: 0.05, e: [], th: [], v: [], dir: [], roll: [], target: [], names: [] }
  const name = (s) => {
    const i = out.names.indexOf(s)
    if (i >= 0) return i
    out.names.push(s)
    return out.names.length - 1
  }
  const yaw = (r) => {
    const [w, x, y, z] = ['robot_qw', 'robot_qx', 'robot_qy', 'robot_qz'].map((c) => Number(r[col(c)]))
    return Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
  }
  let j = 0
  let lastDir = 0
  for (let ts = 0.1; ts <= 24; ts += out.dt) {
    while (j < rows.length - 2 && t[j + 1] <= ts) j++
    const r = rows[j]
    out.e.push(+(Number(r[col('elevator_z')]) * 39.37).toFixed(1))
    const pitch = 2 * Math.atan2(Number(r[col('pivot_qy')]), Number(r[col('pivot_qw')])) / DEG
    let th = -pitch - 90
    th = ((th + 180) % 360 + 360) % 360 - 180
    if (th < -150) th += 360
    out.th.push(+th.toFixed(1))
    // Speed and travel direction from the pose over the last 0.2 s, robot-relative.
    let i0 = j
    while (i0 > 0 && t[j] - t[i0] < 0.2) i0--
    const dt = Math.max(1e-3, t[j] - t[i0])
    const dx = Number(r[col('robot_x')]) - Number(rows[i0][col('robot_x')])
    const dy = Number(r[col('robot_y')]) - Number(rows[i0][col('robot_y')])
    let v = Math.hypot(dx, dy) / dt
    if (!(v < 4.6)) v = 0 // a pose reset in the log, not motion
    if (v > 0.15) lastDir = Math.atan2(dy, dx) - yaw(r)
    out.v.push(+v.toFixed(2))
    out.dir.push(+lastDir.toFixed(3))
    const roll = r[col('rollers_state')]
    out.roll.push(roll === 'INTAKE' ? 1 : roll.startsWith('EJECT') ? -1 : 0)
    out.target.push(name((r[col('pivot_state')] || r[col('elev_state')] || 'TOP').toLowerCase()))
  }
  return out
}
const TRACE = trace()

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
{
  const plate = { x: BENCH.x + BENCH.w - 52, y: BENCH.y + BENCH.d - 14, w: 40, d: 9, r: 1 }
  const rules = [[3, 18], [5, 12], [7, 15]].map(([dy, len]) => Ln(k.lineOnTop([plate.x + 3, plate.y + dy], [plate.x + 3 + len, plate.y + dy], 0.8, P), { tone: 'lo', free: true }))
  box('plate', plate, 0, 0.8, { tone: 'lo' }, { steps: 4, extra: Ln(k.planOutline(k.insetPlan(plate, 1.2), 0.8, P, 4), { tone: 'faint' }) + rules.join('') })
  const cx = plate.x + plate.w - 9
  const cy = plate.y + plate.d / 2
  const F = G.frameOf([cx, cy, 0.8], [0, 0, 1], [1, 0, 0], [0, 1, 0])
  const pill = G.stadium(2.1, 2.1, 8, 24).map(([u, v]) => [u - 4, v])
  const mark = `<g transform="${k.topMatrix([cx, cy], 1.15, P, 'x')}"><text class="an-mark" x="0" y="0.85" font-size="2.4" text-anchor="middle"><tspan class="an-slash">/</tspan>bp<tspan class="an-slash">/</tspan></text></g>`
  put('plate.pill', [cx, cy, 1], S(G.prismOf(F, pill, 0, 0.35, P), { tone: 'mid' }) + mark, [A.prism(F, pill, 0, 0.35, { name: 'plate.pill' })], { bias: 0.2 })
}

// A small lamp on a face that looks along +y.
function lampY(x, y, z, key, attr = 'io') {
  const F = G.frameAlong([x, y, z], [0, 1, 0])
  return { svg: S(G.disc(0, 0.6, 1.05, F, P, { steps: 18 }), { tone: 'mid' }) + `<path class="an-lens" data-${attr}="${key}" d="${G.circleOf(F, 0.61, 0.66, P, 16)}"/>`, shape: A.disc(F, 0, 0.6, 1.05, { name: `lamp.${key}` }) }
}

// ---------- The brain ----------
{
  const b = BRAIN
  const face = b.y + b.d
  const s = SCREEN
  const back = face - 0.6
  const lineZ = [s.z1 - 3, s.z1 - 6.4]
  const screen =
    `<g transform="${facePlane(back)}"><rect class="an-glass" x="${s.x0}" y="${-s.z1}" width="${s.x1 - s.x0}" height="${s.z1 - s.z0}"/>` +
    `<text class="an-text" data-line="0" x="${s.x0 + 1}" y="${-lineZ[0]}" font-size="${s.font}">sim</text>` +
    `<text class="an-text" data-line="1" data-dim="" x="${s.x0 + 1}" y="${-lineZ[1]}" font-size="${s.font}">&gt; top</text></g>` +
    Ln(k.pathOf([[s.x0, face, s.z1], [s.x0, back, s.z1], [s.x0, back, s.z0], [s.x1, back, s.z0], [s.x1, face, s.z0]].map(at)), { tone: 'faint' }) +
    `<path class="iso-top" d="${k.pathOf([[s.x0, back, s.z0], [s.x1, back, s.z0], [s.x1, face, s.z0], [s.x0, face, s.z0]].map(at), true)}"/>` +
    Ln(k.pathOf([[s.x0, face, s.z0], [s.x1, face, s.z0], [s.x1, face, s.z1], [s.x0, face, s.z1]].map(at), true), { tone: 'lo' })
  const vents = Array.from({ length: 4 }, (_, i) => k.planOutline({ x: b.x + 16 + i * 2.2, y: b.y + 3, w: 1, d: 7, r: 0.5 }, b.top, P, 3)).join('')
  const lamps = ['real', 'sim', 'replay'].map((m, i) => lampY(b.x + 4 + i * 4, face, 6, m, 'mode'))
  box('brain', b, 0, b.top, {}, {
    steps: 3, bevel: 0.5, inner: Ln(k.sideSeam(b, b.top - 2.4, P, 3), { tone: 'faint' }),
    extra: screen + Ln(vents, { tone: 'lo' }) + lamps.map((l) => l.svg).join('') + Dots(k.corners(b, 1.8).map(([x, y]) => at([x, y, b.top])), { size: 0.4 }),
  })
  lamps.forEach((l) => R.solid(l.shape))
  // Mode switch on top: REAL, SIM, REPLAY.
  const sw = SWITCH
  const dots = MODES.map((m) => {
    const a = switchAngle(m) * DEG
    return at([sw.x + Math.sin(a) * (sw.r + 1.6), sw.y + Math.cos(a) * (sw.r + 1.6), sw.z + 0.5])
  })
  put('brain.switch', [sw.x, sw.y, sw.z + 1.2],
    S(k.cylinder(sw.x, sw.y, sw.r + 2.6, sw.z, 0.5, P, 40), { tone: 'lo' }) + Dots(dots, { size: 0.5, tone: 'hi' }) +
      S(k.cylinder(sw.x, sw.y, sw.r, sw.z + 0.5, 1.9, P, 40, 0.3), { tone: 'mid' }) + Ln(k.knurl(sw.x, sw.y, sw.r, sw.z + 0.5, sw.z + 2.4, 28, P, 0), { tone: 'lo' }) +
      Dots([at([sw.x, sw.y, sw.z + 2.4])], { size: 0.6, tone: 'hi' }),
    [A.cylinder(sw.x, sw.y, sw.r + 2.6, sw.z, 0.5, { name: 'brain.switch.base' }), A.cylinder(sw.x, sw.y, sw.r, sw.z + 0.5, 1.9, { name: 'brain.switch.knob' })])
  // The recorded match on its reel, in a cradle.
  const cradle = { x: REEL.x - 4, y: REEL.y - 3.2, w: 8, d: 6.4, r: 0.6 }
  box('brain.cradle', cradle, b.top, b.top + 2, {}, { steps: 2, bevel: 0.2 })
  const RF = G.frameAlong([REEL.x, REEL.y - 2.6, REEL.z], [0, 1, 0])
  put('brain.reel', [REEL.x, REEL.y, REEL.z],
    S(G.disc(0, 0.5, REEL.r, RF, P, { steps: 56 }), { tone: 'mid' }) + S(G.disc(0.5, 4.7, REEL.r - 2.2, RF, P, { steps: 56 }), { tone: 'lo' }) + S(G.disc(4.7, 5.2, REEL.r, RF, P, { steps: 56 }), { tone: 'mid' }) +
      Ln(G.circleOf(RF, 5.21, 1.4, P, 20), { tone: 'lo' }),
    [A.disc(RF, 0, 5.2, REEL.r, { name: 'brain.reel', owner: 'reel' })])
  // To the robot: a connector on the brain's back corner, with its lamp.
  const conn = { x: b.x + 20, y: b.y + b.d, w: 9, d: 2.4, r: 0.5 }
  const l = lampY(conn.x + 6.4, conn.y + conn.d, 4.2, 'robot')
  const socket = Ln(k.ring(conn.x + 2.6, conn.y + conn.d / 2, 0.9, 6.5, P, 16), { tone: 'lo' })
  box('brain.robot', conn, 1.5, 6.5, {}, { steps: 2, bevel: 0.25, extra: l.svg + socket })
  R.solid(l.shape)
}

// ---------- Motor controllers ----------
{
  box('tray', TRAY, 0, 1.4, { tone: 'lo' }, { steps: 3, bevel: 0.3 })
  CONTROLLERS.forEach((c, i) => {
    const plan = { x: c.x - 2.6, y: c.y - 3, w: 5.2, d: 6, r: 0.5 }
    const l = lampY(c.x + 1.2, plan.y + plan.d, 3.4, String(i), 'mc')
    box(`mc.${i}`, plan, 1.4, 5, {}, { steps: 2, bevel: 0.2, extra: l.svg + Ln(k.lineOnTop([plan.x + 1, plan.y + 1.4], [plan.x + plan.w - 1, plan.y + 1.4], 5, P), { tone: 'faint' }) })
    R.solid(l.shape)
  })
}

// ---------- Bus trough along the back ----------
{
  const from = BRAIN.x + BRAIN.w
  const trough = { x: from, y: BENCH.y + 4, w: CAMERA.x + 10 - from, d: 6, r: 0.5 }
  const joints = [-112, -78, -46, -12, 30, 74].map((x) => k.lineOnTop([x, trough.y], [x, trough.y + trough.d], 2.4, P)).join('')
  box('trough', trough, 0, 2.4, { tone: 'lo' }, { steps: 2, bevel: 0.2, inner: Ln(k.sideSeam(trough, 1.8, P, 2), { tone: 'faint' }), extra: Ln(joints, { tone: 'faint' }) })
}

// A stand-in's junction box against the trough, with its IO lamp.
function junction(x, key) {
  const plan = { x: x - 4, y: BENCH.y + 10, w: 8, d: 5, r: 0.6 }
  const l = lampY(x + 1.6, plan.y + plan.d, 3, key)
  box(`junction.${key}`, plan, 0, 5, {}, { steps: 2, bevel: 0.25, extra: l.svg })
  R.solid(l.shape)
}

// ---------- Elevator stand-in ----------
{
  const e = ELEVATOR
  junction(e.x, 'elevator')
  const base = { x: e.x - e.half - 3, y: e.y - 6, w: (e.half + 3) * 2, d: 12, r: 1 }
  box('elevator.base', base, 0, 2, { tone: 'lo' }, { steps: 3, bevel: 0.3, extra: ringScrews(k.corners(base, 2), 2, 0.6) })
  const upright = (sx) => ({ x: e.x + sx * e.half - 1.2, y: e.y - 1.2, w: 2.4, d: 2.4, r: 0.2 })
  // Rulers on the uprights' front: one tick per 4 in of carriage travel.
  const ticks = Array.from({ length: 9 }, (_, i) => k.segment([e.x + e.half - 1.2, e.y + 1.21, e.base + i * 4], [e.x + e.half + 0.4, e.y + 1.21, e.base + i * 4], P)).join('')
  box('elevator.upright.left', upright(-1), 2, e.top, {}, { steps: 1 })
  box('elevator.upright.right', upright(1), 2, e.top, {}, { steps: 1, extra: Ln(ticks, { tone: 'lo' }) })
  const bar = { x: e.x - e.half - 1.2, y: e.y - 1.2, w: (e.half + 1.2) * 2, d: 2.4, r: 0.2 }
  box('elevator.crossbar', bar, e.top, e.top + 2.4, {}, { steps: 1 })
  // Drum under the crossbar, two motors and the gear pair (58:14) on top.
  const DF = G.frameAlong([e.x, e.y - 3, DRUM.z], [0, 1, 0])
  put('elevator.drum', [e.x, e.y, DRUM.z], S(G.disc(0, 6, DRUM.r, DF, P, { steps: 32 }), { tone: 'mid' }) + S(G.disc(5.4, 6, DRUM.r + 1.2, DF, P, { steps: 32 }), { tone: 'mid' }) +
    S(G.disc(-0.6, 0, DRUM.r + 1.2, DF, P, { steps: 32 }), { tone: 'mid' }),
    [A.disc(DF, -0.6, 6, DRUM.r + 1.2, { name: 'elevator.drum', ground: true })])
  for (const dx of [-4.2, 4.2]) {
    const m = [e.x + dx, e.y]
    put('elevator.motor', [m[0], m[1], e.top + 5], S(k.cylinder(m[0], m[1], 1.9, e.top + 2.4, 5.2, P, 24), { tone: 'mid' }) + Ln(k.knurl(m[0], m[1], 1.9, e.top + 2.4, e.top + 7.6, 16, P, 0), { tone: 'lo' }),
      [A.cylinder(m[0], m[1], 1.9, e.top + 2.4, 5.2, { name: 'elevator.motor' })])
  }
}

// ---------- Pivot stand-in ----------
{
  const p = PIVOT
  junction(p.x, 'pivot')
  const base = { x: p.x - 7, y: p.y - 6, w: 14, d: 12, r: 1 }
  box('pivot.base', base, 0, 2, { tone: 'lo' }, { steps: 3, bevel: 0.3, extra: ringScrews(k.corners(base, 2), 2, 0.6) })
  put('pivot.post', [p.x, p.y, p.z / 2], S(k.cylinder(p.x, p.y, 1.8, 2, p.z - 2 - 2.6, P, 20), { tone: 'mid' }), [A.cylinder(p.x, p.y, 1.8, 2, p.z - 2 - 2.6, { name: 'pivot.post' })])
  const block = { x: p.x - 3, y: p.y - 3, w: 6, d: 6.2, r: 0.6 }
  box('pivot.block', block, p.z - 2.6, p.z + 2.6, {}, { steps: 2, bevel: 0.3 })
  // Gear pair (4.5:1) on the block's front face, motor behind it.
  const GF = G.frameAlong([p.x, block.y + block.d, p.z], [0, 1, 0])
  put('pivot.gear', [p.x, block.y + block.d + 0.4, p.z], S(G.disc(0, 0.8, 3.2, GF, P, { steps: 36 }), { tone: 'mid' }) + Dots(G.dotsOf(GF, 0.8, 2.4, 8, P, { all: true }), { size: 0.35, tone: 'lo' }),
    [A.disc(GF, 0, 0.8, 3.2, { name: 'pivot.gear', owner: 'pivot.block' })])
  const MF = G.frameAlong([p.x, block.y, p.z + 1], [0, -1, 0])
  put('pivot.motor', [p.x, block.y - 3, p.z + 1], S(G.disc(0, 5, 2, MF, P, { steps: 24 }), { tone: 'mid' }), [A.disc(MF, 0, 5, 2, { name: 'pivot.motor' })])
}

// ---------- Intake flywheel stand-in ----------
{
  const f = FLYWHEEL
  junction(f.x, 'intake')
  const base = { x: f.x - 7, y: f.y - 6, w: 14, d: 12, r: 1 }
  box('intake.base', base, 0, 2, { tone: 'lo' }, { steps: 3, bevel: 0.3 })
  for (const sy of [-1, 1]) box('intake.yoke', { x: f.x - 1.4, y: f.y + sy * 3.4 - 0.6, w: 2.8, d: 1.2, r: 0.2 }, 2, f.z + 1.4, {}, { steps: 1 })
  const F = G.frameAlong([f.x, f.y - 2.2, f.z], [0, 1, 0])
  put('intake.wheel', [f.x, f.y, f.z], S(G.disc(0, 4.4, f.r, F, P, { steps: 64 }), { tone: 'mid' }) + S(G.disc(4.4, 4.5, 2.2, F, P, { steps: 24 }), { tone: 'mid' }),
    [A.disc(F, 0, 4.5, f.r, { name: 'intake.wheel', ground: true })])
  const MF = G.frameAlong([f.x, f.y - 4, f.z], [0, -1, 0])
  put('intake.motor', [f.x, f.y - 6.5, f.z], S(G.disc(0, 5, 1.9, MF, P, { steps: 24 }), { tone: 'mid' }), [A.disc(MF, 0, 5, 1.9, { name: 'intake.motor', ground: true })])
}

// ---------- Swerve stand-in: four modules on floor pads ----------
{
  junction(SWERVE.x, 'swerve')
  const plate = { x: SWERVE.x - SWERVE.half - 7, y: SWERVE.y - SWERVE.half - 2, w: (SWERVE.half + 7) * 2, d: (SWERVE.half + 2) * 2, r: 1.5 }
  box('swerve.plate', plate, 0, 1.4, { tone: 'lo' }, { steps: 3, bevel: 0.3, extra: Ln(k.planOutline(k.insetPlan(plate, 2), 1.4, P, 3), { tone: 'faint' }) })
  for (const [mx, my] of MODULES) {
    put('swerve.pad', [mx, my, 1.4], S(k.cylinder(mx, my, 5.6, 1.4, 0.01, P, 32), { tone: 'lo', crease: 'none' }) + Ln(k.ring(mx, my, 4.6, 1.41, P, 32), { tone: 'faint' }), [A.cylinder(mx, my, 5.6, 1.4, 0.01, { name: 'swerve.pad' })])
  }
}

// ---------- Vision stand-in: a camera facing an AprilTag board ----------
{
  const c = CAMERA
  junction(c.x, 'vision')
  put('camera.post', [c.x, c.y, c.z / 2], S(k.cylinder(c.x, c.y, 3, 0, 0.8, P, 20), { tone: 'lo' }) + S(k.cylinder(c.x, c.y, 1.4, 0.8, c.z - 3.2, P, 16), { tone: 'mid' }),
    [A.cylinder(c.x, c.y, 1.4, 0.8, c.z - 3.2, { name: 'camera.post' }), A.cylinder(c.x, c.y, 3, 0, 0.8, { name: 'camera.foot' })])
  const body = { x: c.x - 3.2, y: c.y - 2.6, w: 6.4, d: 5.2, r: 0.6 }
  box('camera.body', body, c.z - 2.4, c.z + 2.6, {}, { steps: 2, bevel: 0.3 })
  const LF = G.frameAlong([body.x, c.y, c.z + 0.1], [-1, 0, 0])
  put('camera.lens', [body.x - 1, c.y, c.z], S(G.disc(0, 2.2, 1.8, LF, P, { steps: 24 }), { tone: 'hi' }) + Ln(G.circleOf(LF, 2.2, 1, P, 16), { tone: 'lo' }),
    [A.disc(LF, 0, 2.2, 1.8, { name: 'camera.lens' })])
  // The board: two legs and a plate whose face looks back at the camera.
  const t = TAGBOARD
  for (const sy of [-1, 1]) box('tag.leg', { x: t.x, y: t.y + sy * (t.half - 1.5) - 0.8, w: 1.6, d: 1.6, r: 0.2 }, 0, t.z - t.half, {}, { steps: 1 })
  const board = { x: t.x - 0.8, y: t.y - t.half - 1, w: 1.4, d: (t.half + 1) * 2, r: 0.2 }
  // A 6 x 6 tag with its black border, in the board's face plane (local -y, -z).
  const n = 8
  const cell = (t.half * 2 - 4) / n
  const bits = [
    '11111111', '10010011', '10110101', '11001001', '10100111', '11011001', '10101011', '11111111',
  ]
  const rects = []
  bits.forEach((row, ri) => [...row].forEach((bit, ci) => {
    if (bit === '1') rects.push(`<rect x="${(-t.y - t.half + 2 + ci * cell).toFixed(2)}" y="${(-(t.z + t.half - 2) + ri * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`)
  }))
  const tag = `<g transform="${facePlaneX(board.x + board.w + 0.01)}" class="an-tag"><rect class="an-tagpaper" x="${-t.y - t.half + 1}" y="${-(t.z + t.half - 1)}" width="${t.half * 2 - 2}" height="${t.half * 2 - 2}"/>${rects.join('')}</g>`
  box('tag.board', board, t.z - t.half, t.z + t.half, {}, { steps: 1, extra: tag })
}

// ---------- Slots ----------
const e = ELEVATOR
put('slot.weight', [e.x, e.y, e.base + 18], '', [A.box([e.x - 5, e.y - 3.5, e.base], [e.x + 5, e.y + 3.5, e.base + e.travel + 7.2], { name: 'slot.weight', ground: true })], { slot: 'weight' })
put('slot.drum', [e.x, e.y + 3.2, DRUM.z], '', [A.box([e.x - 3, e.y + 3, DRUM.z - 3], [e.x + 3, e.y + 3.05, DRUM.z + 3], { name: 'slot.drum', ground: true })], { slot: 'drum' })
put('slot.pendulum', [PIVOT.x, PIVOT.y + 4.6, PIVOT.z], '', [A.box([PIVOT.x - 3, PIVOT.y + 3.6, PIVOT.z - 3], [PIVOT.x + 3, PIVOT.y + 5.6, PIVOT.z + 3], { name: 'slot.pendulum', ground: true })], { slot: 'pendulum' })
put('slot.flywheel', [FLYWHEEL.x, FLYWHEEL.y + 2.3, FLYWHEEL.z], '', [A.box([FLYWHEEL.x - 8, FLYWHEEL.y + 2.3, FLYWHEEL.z - 8], [FLYWHEEL.x + 8, FLYWHEEL.y + 2.35, FLYWHEEL.z + 8], { name: 'slot.flywheel', ground: true })], { slot: 'flywheel' })
put('slot.swerve', [SWERVE.x, SWERVE.y, 6], '', [A.box([SWERVE.x - SWERVE.half - 4, SWERVE.y - SWERVE.half, 1.4], [SWERVE.x + SWERVE.half + 4, SWERVE.y + SWERVE.half, 12], { name: 'slot.swerve', ground: true })], { slot: 'swerve' })
put('slot.reel', [REEL.x, REEL.y + 2.7, REEL.z], '', [A.box([REEL.x - 6, REEL.y + 2.6, REEL.z - 6], [REEL.x + 6, REEL.y + 2.65, REEL.z + 6], { name: 'slot.reel', ground: true })], { slot: 'reel' })
put('slot.switch', [SWITCH.x, SWITCH.y, SWITCH.z + 2.5], '', [A.box([SWITCH.x - 3, SWITCH.y - 3, SWITCH.z + 2.4], [SWITCH.x + 3, SWITCH.y + 3, SWITCH.z + 2.45], { name: 'slot.switch', ground: true })], { slot: 'switch' })

finish(R, P, {
  name: 'robotsim',
  W,
  H,
  prefix,
  label: "The 2025 robot's brain on a test bench: its controller box, with a REAL / SIM / REPLAY switch and a reel holding a recorded match, and its twelve motor controllers. In SIM they drive stand-ins that are the physics the simulation computes: a weight on a drum for the elevator, a pendulum for the pivot, a flywheel for the intake, four swerve modules on floor pads, and a camera facing an AprilTag board. The code is the same in every mode; only what it is wired to changes.",
  exports: { TRACE },
  mustFollow: [
    ['slot.weight', 'elevator.upright.left'], ['slot.weight', 'elevator.base'], ['elevator.upright.right', 'slot.weight'], ['elevator.drum', 'slot.weight'], ['slot.drum', 'elevator.drum'],
    ['slot.pendulum', 'pivot.post'], ['slot.pendulum', 'pivot.gear'], ['slot.pendulum', 'pivot.block'],
    ['slot.flywheel', 'intake.wheel'], ['slot.swerve', 'swerve.plate'], ['slot.swerve', 'swerve.pad'],
    ['slot.reel', 'brain.reel'], ['slot.switch', 'brain.switch'],
  ],
  preview: () => {
    const i = Math.round(20.5 / TRACE.dt)
    return {
      slots: {
        weight: weightSvg(TRACE.e[i]), drum: drumMark(TRACE.e[i]), pendulum: pendulumSvg(TRACE.th[i]), flywheel: flywheelSpokes(0.4), swerve: swerveSvg(TRACE.dir[i], 0.8),
        reel: reelSpokes(0.3), switch: switchPointer(switchAngle('SIM')),
      },
      plate: { fig: '// fig 04', title: 'same code, any body', hint: 'click the switch', readout: `sim · ${TRACE.names[TRACE.target[i]]} · ${TRACE.e[i]} in · ${Math.round(TRACE.th[i])}°` },
    }
  },
})
