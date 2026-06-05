import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createStateTower } from './stateTower.js'
import { createTrajectoryPlayer } from './trajectory.js'

// 2025 Reefscape field dimensions, in meters
const FIELD_LENGTH_M = 17.548
const FIELD_WIDTH_M  = 8.052

const SCENE_PER_METER = 1.0

// The 2025 field group sits at Z = -20 in world space
const FIELD_SCENE_Z = -20

const CSV_URL = '/wpilog/akit_25_sim.auto.csv'

// Field-coord (WPI) → scene-coord (Three, Y-up).
// The 2025 field is offset -20 in scene Z, so fieldZ adds that.
function fieldX(x) { return (x - FIELD_LENGTH_M / 2) * SCENE_PER_METER }
function fieldZ(y) { return (y - FIELD_WIDTH_M  / 2) * SCENE_PER_METER + FIELD_SCENE_Z }
function fieldY(z) { return z * SCENE_PER_METER }

function quatYaw(qw, qx, qy, qz) {
  return Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz))
}

// Minimal RFC-4180 CSV parser
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

// Reefer GLB's natural forward is 180° opposite the 2026 robot, so add π.
const ROBOT_YAW_OFFSET   = -Math.PI / 2
const ROBOT_LATERAL_FLIP = 1

export function loadAutoPlayback2025(scene, allUpdaters, manager) {
  const robotGroup = new THREE.Group()
  robotGroup.visible = false
  scene.add(robotGroup)

  const loader = new GLTFLoader(manager)

  loader.load('/models/Robot_Reefer/model.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    m.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(m)
    const center = box.getCenter(new THREE.Vector3())
    m.position.set(-center.x, -box.min.y, -center.z)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    robotGroup.add(m)
  })

  // Mechanism groups: elevator (component 0) and pivot (component 1)
  const elevatorGroup = new THREE.Group()
  robotGroup.add(elevatorGroup)

  const pivotGroup = new THREE.Group()
  robotGroup.add(pivotGroup)

  // Zeroed offset applied as a child group under each mechanism group.
  // Reefer config zeroedPosition format: [x, y, z] (standard order).
  // Three.js offset = (json[0], json[2], json[1]) = (x, z, y).
  // zeroedRotations z:-90° → meshYawQ = -π/2 around Y, applied to pivot only
  // (elevator just translates; no yaw correction needed on its configGroup).
  const elevYawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),  Math.PI / 2)
  const pivYawQ  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)

  // Elevator component 0: zeroedPosition [0, 0, 0], +90° CCW around Y
  const elevatorConfigGroup = new THREE.Group()
  elevatorConfigGroup.position.set(0, 0, 0)
  elevatorConfigGroup.quaternion.copy(elevYawQ)
  elevatorGroup.add(elevatorConfigGroup)

  // Pivot component 1: zeroedPosition [0.0889, 0, -0.860425]
  // Mapping (config_y, config_x, config_z) → Three.js (config[1], config[2], config[0])
  // = (0, -0.860425, 0.0889); orientation -90° around Y
  const pivotConfigGroup = new THREE.Group()
  pivotConfigGroup.position.set(0, -0.860425, 0.0889)
  pivotConfigGroup.quaternion.copy(pivYawQ)
  pivotGroup.add(pivotConfigGroup)

  loader.load('/models/Robot_Reefer/model_0.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    elevatorConfigGroup.add(m)
  })

  loader.load('/models/Robot_Reefer/model_1.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    pivotConfigGroup.add(m)
  })

  // "The Robot's Mind": a tower of per-subsystem state pills above the robot.
  const tower = createStateTower(robotGroup,
    ['Elevator', 'Pivot', 'Rollers', 'Swerve'], { topY: 2.6 })

  // PathPlanner trajectory — a green spline showing only the path segment active
  // at the current playback time. Field-absolute, using the same x/y → scene
  // mapping the robot uses so it overlays the driven path.
  const trajectory = createTrajectoryPlayer(scene,
    ([x, y]) => new THREE.Vector3(fieldX(x), 0.03, fieldZ(y) * ROBOT_LATERAL_FLIP))
  fetch('/wpilog/akit_25_path.json').then(r => r.ok ? r.json() : null).then(segs => {
    if (segs) trajectory.setSegments(segs)
  }).catch(() => {})

  let data = null
  let totalSec = 0
  let startSec = null

  fetch(CSV_URL).then(r => {
    if (!r.ok) throw new Error('CSV fetch failed: ' + r.status)
    return r.text()
  }).then(text => {
    const rows = parseCSV(text)
    if (!rows.length) return
    const header = rows[0]
    const idx = Object.fromEntries(header.map((h, i) => [h, i]))
    const out = []
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      if (row.length !== header.length) continue
      const num = (k) => {
        const v = row[idx[k]]
        return v === '' || v == null ? NaN : parseFloat(v)
      }
      out.push({
        t: num('t_s'),
        robot:    [num('robot_x'),    num('robot_y'),    num('robot_z'),
                   num('robot_qw'),   num('robot_qx'),   num('robot_qy'),   num('robot_qz')],
        elevator: [num('elevator_x'), num('elevator_y'), num('elevator_z'),
                   num('elevator_qw'), num('elevator_qx'), num('elevator_qy'), num('elevator_qz')],
        pivot:    [num('pivot_x'),    num('pivot_y'),    num('pivot_z'),
                   num('pivot_qw'),   num('pivot_qx'),   num('pivot_qy'),   num('pivot_qz')],
        elev_state:    row[idx['elev_state']]    ?? '',
        pivot_state:   row[idx['pivot_state']]   ?? '',
        rollers_state: row[idx['rollers_state']] ?? '',
        swerve_state:  row[idx['swerve_state']]  ?? '',
      })
    }
    data = out
    totalSec = data[data.length - 1].t
    robotGroup.visible = true
  }).catch(err => {
    console.warn('[autoPlayback2025]', err)
  })

  function findRowAt(tSec) {
    let lo = 0, hi = data.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (data[mid].t <= tSec) lo = mid; else hi = mid - 1
    }
    return data[lo]
  }

  // Places a mechanism group (child of robotGroup) at a WPI robot-local Pose3d.
  // WPI robot-local frame: X=forward, Y=left, Z=up.
  // Three.js robotGroup local: +Z=forward, +X=left, +Y=up.
  function applyLocalPose(target, pose) {
    const [x, y, z, qw, qx, qy, qz] = pose
    if (!Number.isFinite(x)) { target.visible = false; return }
    target.visible = true
    target.position.set(
      y * SCENE_PER_METER * ROBOT_LATERAL_FLIP,
      z * SCENE_PER_METER,
      x * SCENE_PER_METER,
    )
    target.quaternion.set(
      qy * ROBOT_LATERAL_FLIP,
      qz,
      qx,
      qw,
    )
  }

  function tick(elapsed) {
    if (!data) return
    if (startSec === null) startSec = elapsed
    const t = (elapsed - startSec) % totalSec
    const row = findRowAt(t)

    // Show the PathPlanner segment active at this moment.
    trajectory.update(t)

    // Drive the subsystem state tower (texture work only when a state changes).
    tower.update({
      Elevator: row.elev_state,
      Pivot:    row.pivot_state,
      Rollers:  row.rollers_state,
      Swerve:   row.swerve_state,
    })

    const [rx, ry, rz, rqw, rqx, rqy, rqz] = row.robot
    if (Number.isFinite(rx)) {
      robotGroup.position.set(
        fieldX(rx),
        fieldY(rz),
        fieldZ(ry) * ROBOT_LATERAL_FLIP,
      )
      const yaw = quatYaw(rqw, rqx, rqy, rqz)
      robotGroup.rotation.set(0, -yaw * ROBOT_LATERAL_FLIP + ROBOT_YAW_OFFSET, 0)
    }

    applyLocalPose(elevatorGroup, row.elevator)
    applyLocalPose(pivotGroup,    row.pivot)
  }

  allUpdaters.push(tick)
}
