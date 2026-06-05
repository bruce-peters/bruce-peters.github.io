import * as THREE from 'three'

// Plays back the PathPlanner ActivePath as a green spline that shows only the
// segment active at the current playback time — the path the robot is following
// *right now* — rebuilding the tube whenever the active segment changes.
//
//   const traj = createTrajectoryPlayer(scene, ([x, y]) => mapToScene(x, y))
//   traj.setSegments(segs)   // segs: [{ t, pts: [[x, y], ...] }, ...] from the *_path.json
//   traj.update(t)           // each frame, with the loop-relative playback time
export function createTrajectoryPlayer(scene, mapPoint, opts = {}) {
  const radius = opts.radius ?? 0.04
  const tubeRadialSegs = 8

  const group = new THREE.Group()
  group.visible = false
  scene.add(group)

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x57d36a, transparent: true, opacity: opts.opacity ?? 0.95,
  })
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x57d36a, transparent: true, opacity: 0.18,
    depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const core = new THREE.Mesh(new THREE.BufferGeometry(), coreMat)
  const halo = new THREE.Mesh(new THREE.BufferGeometry(), haloMat)
  core.renderOrder = 3
  halo.renderOrder = 2
  group.add(halo, core)

  let segments = []   // [{ t, points: Vector3[] }]
  let curIdx = -1

  function setSegments(segs) {
    segments = (segs || []).map(s => ({
      t: s.t,
      points: (s.pts || []).map(p => mapPoint(p)),
    }))
    segments.sort((a, b) => a.t - b.t)
    curIdx = -1
    rebuild(-1)
  }

  function rebuild(idx) {
    core.geometry.dispose()
    halo.geometry.dispose()
    const pts = idx >= 0 ? segments[idx].points : null
    if (!pts || pts.length < 2) {
      core.geometry = new THREE.BufferGeometry()
      halo.geometry = new THREE.BufferGeometry()
      group.visible = false
      return
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
    const tubeSegs = Math.max(48, pts.length * 12)
    core.geometry = new THREE.TubeGeometry(curve, tubeSegs, radius, tubeRadialSegs, false)
    halo.geometry = new THREE.TubeGeometry(curve, tubeSegs, radius * 2.6, tubeRadialSegs, false)
    group.visible = true
  }

  // t: loop-relative playback time (seconds). Picks the latest segment whose
  // start time has passed; rebuilds the tube only when that segment changes.
  function update(t) {
    let idx = -1
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].t <= t) idx = i
      else break
    }
    if (idx !== curIdx) {
      curIdx = idx
      rebuild(idx)
    }
  }

  return { group, setSegments, update }
}
