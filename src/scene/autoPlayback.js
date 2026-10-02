import * as THREE from 'three'
import { createGLTFLoader } from './gltf.js'
import { createStateTower } from './stateTower.js'
import { createTrajectoryPlayer } from './trajectory.js'

// FRC 2026 field dimensions, in meters
const FIELD_LENGTH_M = 16.54
const FIELD_WIDTH_M = 8.07

// field.glb is GLTF-standard (1 unit = 1 m). Its 22.56 unit bbox includes the arena
// surround; the playing surface is 16.54 m × 8.07 m within it.
const SCENE_PER_METER = 1.0

// Reefscape fuel: ~15 cm spheres, center at z=0.075 when resting on floor
const FUEL_RADIUS_M = 0.075

// Compact replay built from the auto CSV by scripts/build-replay.mjs — see
// that script for the row layout. One JSON.parse instead of a 16 MB CSV parse.
const REPLAY_URL = '/wpilog/akit_26-05-22_09-20-01.replay.json'

// Field-coord (WPI) → scene-coord (Three, Y-up). Robot's pose lives in field
// coords with X along field length, Y across, Z up.
function fieldX(x) { return (x - FIELD_LENGTH_M / 2) * SCENE_PER_METER }
function fieldZ(y) { return (y - FIELD_WIDTH_M / 2) * SCENE_PER_METER }
function fieldY(z) { return z * SCENE_PER_METER }

function quatYaw(qw, qx, qy, qz) {
  // Yaw around WPI's Z (vertical) axis
  return Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz))
}


// Empirical: robot GLB and WPI yaw=0 don't necessarily align. Adjust here if
// the robot drives "backwards" through the auto routine.
const ROBOT_YAW_OFFSET = Math.PI / 2
const ROBOT_LATERAL_FLIP = 1 // set to -1 to mirror across field width

export function loadAutoPlayback(scene, allUpdaters, manager) {
  // Group that gets driven by the CSV. Robot model parents under it.
  const robotGroup = new THREE.Group()
  robotGroup.visible = false
  scene.add(robotGroup)

  const loader = createGLTFLoader(manager)
  loader.load('/models/robot.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    m.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(m, true)  // precise: see loadFieldModel
    const center = box.getCenter(new THREE.Vector3())
    m.position.set(-center.x, -box.min.y, -center.z)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    robotGroup.add(m)
  })

  // Component groups driven by CSV intake/shooter Pose3d (robot-local WPI frame).
  // Each group is a child of robotGroup; applyLocalPose positions it each tick.
  const intakeGroup = new THREE.Group()
  robotGroup.add(intakeGroup)

  const shooterGroup = new THREE.Group()
  robotGroup.add(shooterGroup)

  // AS zeroedPosition format is [config_y, config_x, config_z] where the Three.js
  // intakeGroup-local offset = (config[1], config[2], config[0]) * SCENE_PER_METER.
  // This configGroup is the third level of the AS hierarchy:
  //   robotGroup → componentGroup (CSV pose) → configGroup (zeroed pose) → mesh
  const meshYawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)

  // intake zeroedPosition: [0, -0.25375, -0.195806]
  const intakeConfigGroup = new THREE.Group()
  intakeConfigGroup.position.set(-0.25375, -0.195806, 0)
  intakeConfigGroup.quaternion.copy(meshYawQ)
  intakeGroup.add(intakeConfigGroup)

  // shooter zeroedPosition: [0, 0.241249, -0.513944]
  const shooterConfigGroup = new THREE.Group()
  shooterConfigGroup.position.set(0.241249, -0.513944, 0)
  shooterConfigGroup.quaternion.copy(meshYawQ)
  shooterGroup.add(shooterConfigGroup)

  // Load model_0.glb — intake rack (back of robot)
  loader.load('/models/model_0.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    intakeConfigGroup.add(m)
  })

  // Load model_1.glb — shooter hood (front of robot)
  loader.load('/models/model_1.glb', (gltf) => {
    const m = gltf.scene
    m.scale.setScalar(SCENE_PER_METER)
    m.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
    shooterConfigGroup.add(m)
  })
  const fuelGeo = new THREE.SphereGeometry(FUEL_RADIUS_M * SCENE_PER_METER, 12, 8)
  const fuelMat = new THREE.MeshStandardMaterial({
    color: 0xFFDD00, emissive: 0x3a2d00, roughness: 0.45, metalness: 0.0,
  })
  const fieldFuelMat = fuelMat
  const robotFuelMat = fuelMat
  const FIELD_FUEL_CAP = 512
  const ROBOT_FUEL_CAP = 80
  const fieldFuel = new THREE.InstancedMesh(fuelGeo, fieldFuelMat, FIELD_FUEL_CAP)
  const robotFuel = new THREE.InstancedMesh(fuelGeo, robotFuelMat, ROBOT_FUEL_CAP)
  fieldFuel.count = 0
  robotFuel.count = 0
  fieldFuel.castShadow = false
  robotFuel.castShadow = false
  fieldFuel.frustumCulled = false
  robotFuel.frustumCulled = false
  scene.add(fieldFuel, robotFuel)

  // "The Robot's Mind": a tower of per-subsystem state pills above the robot.
  const tower = createStateTower(robotGroup,
    ['Intake', 'Shooter', 'Serializer', 'Swerve'], { topY: 2.4 })

  // PathPlanner trajectory — a green spline showing only the path segment active
  // at the current playback time. Field-absolute, using the same x/y → scene
  // mapping the robot uses so it overlays the driven path.
  const trajectory = createTrajectoryPlayer(scene,
    ([x, y]) => new THREE.Vector3(fieldX(x), 0.03, fieldZ(y) * ROBOT_LATERAL_FLIP))
  fetch('/wpilog/akit_26-05-22_09-20-01_path.json').then(r => r.ok ? r.json() : null).then(segs => {
    if (segs) trajectory.setSegments(segs)
  }).catch(() => {})

  // Optional readout span the React side can stamp into.
  const hud = document.getElementById('auto-playback-hud')

  // Load the replay asynchronously
  let data = null
  let totalSec = 0
  let startSec = null

  fetch(REPLAY_URL).then(r => {
    if (!r.ok) throw new Error('replay fetch failed: ' + r.status)
    return r.json()
  }).then(rows => {
    if (!rows.length) return
    let ff = []
    data = rows.map(([t, robot, intake, shooter, rf, ffRow, ...states]) => {
      if (ffRow !== 0) ff = ffRow   // 0 = field fuel unchanged since the previous row
      return {
        t, robot, intake, shooter, rf, ff,
        intake_state:     states[0],
        shooter_state:    states[1],
        serializer_state: states[2],
        swerve_state:     states[3],
      }
    })
    totalSec = data[data.length - 1].t
    robotGroup.visible = true
  }).catch(err => {
    console.warn('[autoPlayback]', err)
  })

  function findRowAt(tSec) {
    let lo = 0, hi = data.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (data[mid].t <= tSec) lo = mid; else hi = mid - 1
    }
    return data[lo]
  }

  const dummy = new THREE.Object3D()

  // Places a component group (child of robotGroup) at a WPI robot-local Pose3d.
  // The CSV logs component poses in WPI robot-local frame (X fwd, Y left, Z up, meters).
  function applyLocalPose(target, pose) {
    const [x, y, z, qw, qx, qy, qz] = pose
    if (!Number.isFinite(x)) { target.visible = false; return }
    target.visible = true
    // robotGroup local frame: +Z = robot forward (GLB nose dir), +X = robot left, +Y = up.
    // WPI robot-local: X=forward, Y=left, Z=up → map to (local Z, local X, local Y).
    target.position.set(
      y * SCENE_PER_METER * ROBOT_LATERAL_FLIP,   // WPI Y (left)  → local +X
      z * SCENE_PER_METER,                          // WPI Z (up)    → local +Y
      x * SCENE_PER_METER,                          // WPI X (fwd)   → local +Z
    )
    target.quaternion.set(
      qy * ROBOT_LATERAL_FLIP,  // WPI qy (around left/X axis) → Three.js qx
      qz,                        // WPI qz (around up/Y axis)   → Three.js qy
      qx,                        // WPI qx (around fwd/Z axis)  → Three.js qz
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
      Intake:     row.intake_state,
      Shooter:    row.shooter_state,
      Serializer: row.serializer_state,
      Swerve:     row.swerve_state,
    })

    // Robot — field-absolute Pose3d
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

    applyLocalPose(intakeGroup, row.intake)
    applyLocalPose(shooterGroup, row.shooter)

    // Robot-held fuel — Pose3d[] in field-absolute coords
    const rf = row.rf
    if (rf.length > 0) {
      const rfN = Math.min(rf.length, ROBOT_FUEL_CAP)
      for (let i = 0; i < rfN; i++) {
        const p = rf[i]
        dummy.position.set(fieldX(p[0]), fieldY(p[2]), fieldZ(p[1]) * ROBOT_LATERAL_FLIP)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        robotFuel.setMatrixAt(i, dummy.matrix)
      }
      robotFuel.count = rfN
      robotFuel.instanceMatrix.needsUpdate = true
    }

    // Field fuel — Translation3d[] in field-absolute coords
    const ff = row.ff
    if (ff.length > 0) {
      const ffN = Math.min(ff.length, FIELD_FUEL_CAP)
      for (let i = 0; i < ffN; i++) {
        const p = ff[i]
        dummy.position.set(fieldX(p[0]), fieldY(p[2]), fieldZ(p[1]) * ROBOT_LATERAL_FLIP)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        fieldFuel.setMatrixAt(i, dummy.matrix)
      }
      fieldFuel.count = ffN
      fieldFuel.instanceMatrix.needsUpdate = true
    }

    if (hud) {
      hud.textContent = `AUTO REPLAY · ${t.toFixed(1)}s / ${totalSec.toFixed(1)}s`
    }
  }

  allUpdaters.push(tick)
}
