// Build-time script: converts an auto-period CSV (from wpilog_to_csv.py) into a
// compact JSON replay that src/scene/autoPlayback.js loads with one JSON.parse.
//
// Why: the 2026 CSV is 16 MB, mostly field-fuel poses stored as JSON strings
// inside CSV cells. Parsing it in the browser took ~2.4 s of main-thread time
// right as the scene revealed. This output drops the fuel quaternions the
// runtime never reads, rounds to sub-millimetre precision, and stores the
// field-fuel list only when it changes (0 = same as the previous row).
//
// Row layout: [t, robot7, intake7, shooter7, robotFuel, fieldFuel|0,
//              intakeState, shooterState, serializerState, swerveState]
// Pose7 = [x, y, z, qw, qx, qy, qz]; fuel entries are [x, y, z]. Missing
// numbers become null (the runtime treats them like NaN via Number.isFinite).
//
// Usage: node scripts/build-replay.mjs public/wpilog/<file>.auto.csv [out.json]

import { readFileSync, writeFileSync } from 'fs'

const [inPath, outArg] = process.argv.slice(2)
if (!inPath) {
  console.error('usage: node scripts/build-replay.mjs <in.auto.csv> [out.json]')
  process.exit(1)
}
const outPath = outArg ?? inPath.replace(/\.auto\.csv$/, '') + '.replay.json'

// Same RFC-4180 parser the runtime used to run (field_fuel_poses is quoted JSON).
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQ = false
      } else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

const round = (v, d) => {
  if (v === '' || v == null) return null
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (!Number.isFinite(n)) return null
  const k = 10 ** d
  return Math.round(n * k) / k
}

function safeParse(s) {
  if (!s) return []
  try { return JSON.parse(s) } catch { return [] }
}

const rows = parseCSV(readFileSync(inPath, 'utf8'))
const header = rows[0]
const idx = Object.fromEntries(header.map((h, i) => [h, i]))
const pose = (row, prefix) =>
  ['x', 'y', 'z', 'qw', 'qx', 'qy', 'qz'].map((k, i) => round(row[idx[`${prefix}_${k}`]], i < 3 ? 4 : 5))
const fuel = (s) => safeParse(s).map(p => [round(p[0], 3), round(p[1], 3), round(p[2], 3)])

const out = []
let prevFF = null
for (let r = 1; r < rows.length; r++) {
  const row = rows[r]
  if (row.length !== header.length) continue
  const ff = fuel(row[idx.field_fuel_poses])
  const ffKey = JSON.stringify(ff)
  out.push([
    round(row[idx.t_s], 4),
    pose(row, 'robot'),
    pose(row, 'intake'),
    pose(row, 'shooter'),
    fuel(row[idx.robot_fuel_poses]),
    ffKey === prevFF ? 0 : ff,
    row[idx.intake_state] ?? '',
    row[idx.shooter_state] ?? '',
    row[idx.serializer_state] ?? '',
    row[idx.swerve_state] ?? '',
  ])
  prevFF = ffKey
}

const json = JSON.stringify(out)
writeFileSync(outPath, json)
console.log(`[build-replay] ${out.length} rows → ${outPath} (${(json.length / 1e6).toFixed(2)} MB)`)
