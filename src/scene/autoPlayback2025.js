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

const ROBOT_LATERAL_FLIP = 1

// From public/models/Robot_Reefer/config.json. The base model and both
// components share one rotation sequence (Y-up GLB → WPILib X fwd, Y left, Z up).
const MODEL_ROTATIONS = [['x', 90], ['z', -90]]
const ELEVATOR_ZEROED_POSITION = [0, 0, 0]
const PIVOT_ZEROED_POSITION    = [0.0889, 0, -0.860425]

// Same as AdvantageScope's rotationSequenceToQuaternion: each step rotates
// about the fixed axes, hence premultiply.
function rotationSequenceToQuaternion(seq) {
  const q = new THREE.Quaternion()
  for (const [axis, deg] of seq) {
    const v = new THREE.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0)
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(v, deg * Math.PI / 180))
  }
  return q
}

export function loadAutoPlayback2025(scene, allUpdaters, manager) {
  const robotGroup = new THREE.Group()
  robotGroup.visible = false
  scene.add(robotGroup)

  // WPILib robot frame inside the Y-up scene: robot forward = robotGroup +X.
  // Everything below is placed exactly the way AdvantageScope places it, so the
  // logged mechanism poses and config offsets apply without axis remapping.
  const wpiFrame = new THREE.Group()
  wpiFrame.rotation.x = -Math.PI / 2
  robotGroup.add(wpiFrame)

  const modelQ = rotationSequenceToQuaternion(MODEL_ROTATIONS)
  const loader = new GLTFLoader(manager)

  loader.load('/models/Robot_Reefer/model.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    // Native Y is up, so this lifts the whole robot (base + mechanisms together)
    // until the lowest part of the chassis sits on the carpet. No horizontal
    // re-centering: the GLB origin is the robot origin the components assume.
    m.updateMatrixWorld(true)
    wpiFrame.position.y = -new THREE.Box3().setFromObject(m).min.y
    m.quaternion.copy(modelQ)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    wpiFrame.add(m)
  })

  // Mechanism hierarchy, as in AdvantageScope:
  //   pose group (logged Pose3d) → config group (zeroed rotation + position) → model
  const elevatorGroup = new THREE.Group()
  wpiFrame.add(elevatorGroup)

  const pivotGroup = new THREE.Group()
  wpiFrame.add(pivotGroup)

  // Elevator, component 0
  const elevatorConfigGroup = new THREE.Group()
  elevatorConfigGroup.position.fromArray(ELEVATOR_ZEROED_POSITION).multiplyScalar(SCENE_PER_METER)
  elevatorConfigGroup.quaternion.copy(modelQ)
  elevatorGroup.add(elevatorConfigGroup)

  // Pivot arm, component 1. zeroedPosition moves the arm's pivot axis to the
  // origin, so the logged pivot pose rotates the arm about that axis.
  const pivotConfigGroup = new THREE.Group()
  pivotConfigGroup.position.fromArray(PIVOT_ZEROED_POSITION).multiplyScalar(SCENE_PER_METER)
  pivotConfigGroup.quaternion.copy(modelQ)
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

  // Places a mechanism group at its WPI robot-local Pose3d. The group lives in
  // wpiFrame, so the logged pose applies as-is.
  function applyLocalPose(target, pose) {
    const [x, y, z, qw, qx, qy, qz] = pose
    if (!Number.isFinite(x)) { target.visible = false; return }
    target.visible = true
    target.position.set(x, y, z).multiplyScalar(SCENE_PER_METER)
    target.quaternion.set(qx, qy, qz, qw)
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
      // wpiFrame already points robot forward along robotGroup +X, so no offset.
      const yaw = quatYaw(rqw, rqx, rqy, rqz)
      robotGroup.rotation.set(0, -yaw * ROBOT_LATERAL_FLIP, 0)
    }

    applyLocalPose(elevatorGroup, row.elevator)
    applyLocalPose(pivotGroup,    row.pivot)
  }

  allUpdaters.push(tick)
}
