import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { PROJECTS, ARCHIVE_PROJECTS, SCENE_ELEMENTS } from '../data/projects.js'
import { makeStars, buildReader, buildProjectCard, buildArchive, buildAbout, loadFieldModel, loadField2025Model, buildScreenshotPanes } from './builders.js'
import { loadAutoPlayback } from './autoPlayback.js'
import { loadAutoPlayback2025 } from './autoPlayback2025.js'
import { initTuneGizmos } from './tuneGizmos.js'

// Smootherstep: zero velocity AND zero acceleration at t=0 and t=1.
// Applied to the fractional part so the camera dwells at each node before
// accelerating through the midpoint and settling gently into the next node.
function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// Blend of linear and smoothstep: minimum derivative 0.5 at t=0 and t=1
// so the camera slows near waypoints but never fully stops mid-transit.
function nodeEase(t) {
  const s = t * t * (3 - 2 * t)   // smoothstep
  return 0.5 * t + 0.5 * s
}

export function initScene(container, onProjectChange, onLoad) {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.7
  container.appendChild(renderer.domElement)

  // Environment map — gives GLTF metallic/glossy materials something to reflect.
  // Without this, PBR materials with any metalness render black.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment()).texture
  pmrem.dispose()

  // Scene
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.Fog(0x000000, 50, 120)
  scene.environment = envTexture
  scene.environmentIntensity = 0.2

  // Camera — initial position matches overview's focusOffset + lookAt so the
  // first frame is consistent with what goToIndex(0) would produce.
  const _overview = PROJECTS.find(p => p.isOverview)
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200)
  camera.position.set(
    _overview.pos[0] + _overview.focusOffset[0],
    _overview.pos[1] + _overview.focusOffset[1],
    _overview.pos[2] + _overview.focusOffset[2]
  )

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.rotateSpeed = 0.5
  controls.enableZoom = false
  controls.enablePan = false
  controls.minDistance = 6
  controls.maxDistance = 50
  controls.maxPolarAngle = Math.PI * 0.9
  controls.minPolarAngle = Math.PI * 0.1
  const _overviewLookAt = _overview.lookAt ?? _overview.pos
  controls.target.set(_overviewLookAt[0], _overviewLookAt[1], _overviewLookAt[2])

  // Lights — dim ambient so shadows read clearly; colored alliance zone point lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.01))

  // Key overhead — kept dim so shadows are visible on the field surface
  const key = new THREE.DirectionalLight(0xfff4d6, 0.12)
  key.position.set(0, 25, 0); key.castShadow = true
  key.shadow.mapSize.set(4096, 4096)
  key.shadow.camera.left = -14; key.shadow.camera.right = 14
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 30
  key.shadow.bias = -0.001
  scene.add(key)

  // Red alliance — left end of field (world -X)
  const redLight = new THREE.PointLight(0xff2200, 18, 14, 2)
  redLight.position.set(-7.5, 3, 0)
  scene.add(redLight)

  // Blue alliance — right end of field (world +X)
  const blueLight = new THREE.PointLight(0x0066ff, 18, 14, 2)
  blueLight.position.set(7.5, 3, 0)
  scene.add(blueLight)

  // Stars
  scene.add(makeStars())

  // Standalone tunable scene elements (field, reader demo) — keyed by id
  const elementGroups = new Map()
  const _fieldEl = SCENE_ELEMENTS.find(e => e.id === 'field')
  const _field2025El = SCENE_ELEMENTS.find(e => e.id === 'field2025')
  const _readerDemoEl = SCENE_ELEMENTS.find(e => e.id === 'readerDemo')

  // Real 2026 FRC field model (async, silently skips if missing)
  const fieldGroup = loadFieldModel(scene, _fieldEl?.pos)
  elementGroups.set('field', fieldGroup)

  // 2025 Reefscape field for the 2025 robot node
  const field2025Group = loadField2025Model(scene, _field2025El?.pos)
  elementGroups.set('field2025', field2025Group)

  // Lights for the 2025 field area
  const red2024 = new THREE.PointLight(0xff2200, 18, 14, 2)
  red2024.position.set(-7.5, 3, -20)
  scene.add(red2024)
  const blue2024 = new THREE.PointLight(0x0066ff, 18, 14, 2)
  blue2024.position.set(7.5, 3, -20)
  scene.add(blue2024)

  // Project groups
  const allUpdaters = []
  const cardGroups = new Map()

  // Tune mode state (declared early so buildScreenshotPanes assignment below can reference paneController)
  let tuneActive = false
  let tuneGizmoManager = null
  let paneController = null

  // Auto-period playback: robot pose, intake/shooter markers, robot-held fuel,
  // and field fuel positions are driven from public/wpilog/<file>.auto.csv.
  loadAutoPlayback(scene, allUpdaters)
  loadAutoPlayback2025(scene, allUpdaters)

  const reader = buildReader(_readerDemoEl?.pos)
  scene.add(reader); allUpdaters.push(reader.userData.update)
  elementGroups.set('readerDemo', reader)

  // About section — 3D floating panel off to the side
  const about = buildAbout()
  scene.add(about); allUpdaters.push(about.userData.update)

  // Extra scene groups (not project cards) that tune mode can reposition
  const extraGroups = new Map([
    ['about',  about],
    ['archive', null],    // filled after buildArchive below
  ])

  // Look up project entries by ID so array indices never break
  const roboticsP  = PROJECTS.find(p => p.id === 'robotics')
  const robot2025P = PROJECTS.find(p => p.id === 'robot2025')
  const simP       = PROJECTS.find(p => p.id === 'sim')
  const scoutingP  = PROJECTS.find(p => p.id === 'scouting')
  const readerP    = PROJECTS.find(p => p.id === 'reader')

  // FRC card — right side of arena, face pointing left toward arena (-X)
  const frcCard = buildProjectCard(roboticsP, { rotY: roboticsP.cardRotY ?? -Math.PI / 2 })
  scene.add(frcCard); allUpdaters.push(frcCard.userData.update)
  cardGroups.set(roboticsP.id, frcCard)

  // 2025 robot card — same layout as main robotics card, positioned next to the 2025 field
  const robot2025Card = buildProjectCard(robot2025P, { rotY: robot2025P.cardRotY ?? -Math.PI / 2 })
  scene.add(robot2025Card); allUpdaters.push(robot2025Card.userData.update)
  cardGroups.set(robot2025P.id, robot2025Card)

  // Sim card — left side of arena, face pointing right toward arena (+X)
  const simCard = buildProjectCard(simP, { rotY: simP.cardRotY ?? Math.PI / 2 })
  scene.add(simCard); allUpdaters.push(simCard.userData.update)
  cardGroups.set(simP.id, simCard)

  // Scouting card
  const scoutCard = buildProjectCard(scoutingP, { rotY: scoutingP.cardRotY ?? 0 })
  scene.add(scoutCard); allUpdaters.push(scoutCard.userData.update)
  cardGroups.set(scoutingP.id, scoutCard)

  // Reader (Word Wiz AI) card — pos and rotY come from projects.js data
  const readerCard = buildProjectCard(readerP, { rotY: readerP.cardRotY ?? 0 })
  scene.add(readerCard); allUpdaters.push(readerCard.userData.update)
  cardGroups.set(readerP.id, readerCard)

  // Archive gate — atmospheric floor disc at corridor entrance
  const archive = buildArchive()
  scene.add(archive); allUpdaters.push(archive.userData.update)
  extraGroups.set('archive', archive)

  // Individual archive work cards — spaced along the negative-Z corridor
  ARCHIVE_PROJECTS.forEach((p) => {
    const g = buildProjectCard(p, { rotY: p.archiveRotY })
    scene.add(g); allUpdaters.push(g.userData.update)
    cardGroups.set(p.id, g)
  })

  // Screenshot panes (load async — silently skip missing files)
  paneController = buildScreenshotPanes(scene, allUpdaters)

  // ── Physics-based continuous scroll ────────────────────────────────────────
  // scroll    : float position in [0, N-1] — directly drives the camera
  // scrollVel : velocity in nodes/sec — added to by inputs, killed by friction
  // snapTarget: integer set by keyboard nav; null = snap to Math.round(scroll)
  // activeIndex: the "current" node for UI (= Math.round(scroll), updated each frame)
  //
  // Design: wheel events directly push velocity — no discrete jumps, no timers.
  // When velocity drops below SNAP_THRESHOLD the camera spring-locks to the
  // nearest node (or snapTarget) so it always rests cleanly at a waypoint.
  // ─────────────────────────────────────────────────────────────────────────
  let scroll     = 0.0
  let scrollVel  = 0.0
  let snapTarget = null   // integer or null
  let activeIndex = 0
  let debugMode  = false  // true while manual camera control is active

  const N               = PROJECTS.length
  const SENSITIVITY     = 0.025  // deltaY (px) → velocity
  const MAX_VEL         = 1.5    // nodes / sec cap
  const FRICTION        = 3.5    // exp decay — slower than before so small inputs linger
  const SNAP_THRESHOLD  = 0.06   // vel below which snap spring activates (was 0.5 — too high, killed small inputs immediately)
  const SNAP_SPEED      = 1.0    // spring speed toward nearest node

  // Pre-compute camera positions and look-at targets for every node, then
  // build open CatmullRom splines so the camera glides smoothly between all
  // waypoints without looping.
  const nodeCamPos = PROJECTS.map(p => new THREE.Vector3(
    p.pos[0] + p.focusOffset[0],
    p.pos[1] + p.focusOffset[1],
    p.pos[2] + p.focusOffset[2]
  ))
  const nodeLookAt = PROJECTS.map(p => new THREE.Vector3(...(p.lookAt ?? p.pos)))

  const camCurve  = new THREE.CatmullRomCurve3(nodeCamPos, false, 'catmullrom', 0.5)
  const lookCurve = new THREE.CatmullRomCurve3(nodeLookAt, false, 'catmullrom', 0.5)

  // goToIndex — instant jump (dot-rail, Home/End).
  // Keyboard arrows instead push velocity directly so the camera scrolls
  // through space rather than teleporting.
  function goToIndex(i, opts = {}) {
    const next = Math.max(0, Math.min(N - 1, i))
    scroll     = next
    scrollVel  = 0
    snapTarget = null
    if (next !== activeIndex || opts.force) {
      activeIndex = next
      onProjectChange(PROJECTS[next], next)
    }
  }

  // Wheel — add to velocity; physics handles the rest.
  // Normalize deltaMode so line-mode devices behave like pixel-mode.
  function onWheel(e) {
    if (tuneActive) return  // OrbitControls handles zoom in tune mode
    e.preventDefault()
    debugMode = false
    const normalisers = [1, 40, 800]
    const delta = e.deltaY * normalisers[e.deltaMode ?? 0]
    scrollVel = Math.max(-MAX_VEL, Math.min(MAX_VEL, scrollVel + delta * SENSITIVITY))
    snapTarget = null  // user is manually scrolling — release keyboard snap target
  }
  window.addEventListener('wheel', onWheel, { passive: false })

  // Keyboard — arrows push velocity (continuous feel); Home/End jump instantly.
  function onKeyDown(e) {
    if (tuneActive) return  // suppress node navigation in tune mode
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault()
      debugMode  = false
      snapTarget = Math.min(N - 1, Math.round(scroll) + 1)
      scrollVel  = 0
    } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
      e.preventDefault()
      debugMode  = false
      snapTarget = Math.max(0, Math.round(scroll) - 1)
      scrollVel  = 0
    } else if (e.key === 'Home') { debugMode = false; goToIndex(0) }
    else if (e.key === 'End')   { debugMode = false; goToIndex(N - 1) }
  }
  document.addEventListener('keydown', onKeyDown)

  // Touch — convert swipe distance to an initial velocity.
  let touchStartY = null
  function onTouchStart(e) { if (e.touches.length === 1) touchStartY = e.touches[0].clientY }
  function onTouchEnd(e) {
    if (touchStartY == null) return
    const dy = (e.changedTouches[0]?.clientY ?? touchStartY) - touchStartY
    if (Math.abs(dy) > 30) {
      debugMode  = false
      scrollVel  = Math.max(-MAX_VEL, Math.min(MAX_VEL, -dy * 0.03))
      snapTarget = null
    }
    touchStartY = null
  }
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd)

  // Drag cursor
  renderer.domElement.addEventListener('pointerdown', () => document.body.classList.add('dragging'))
  renderer.domElement.addEventListener('pointerup', () => document.body.classList.remove('dragging'))
  renderer.domElement.addEventListener('pointerleave', () => document.body.classList.remove('dragging'))

  // Resize
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // Render loop
  const timer = new THREE.Timer()
  let animId = null
  let started = false

  function tick() {
    animId = requestAnimationFrame(tick)
    timer.update()
    const t  = timer.getElapsed()
    const dt = Math.min(timer.getDelta(), 0.1)
    allUpdaters.forEach(fn => fn && fn(t))

    // ── 1. Integrate velocity ───────────────────────────────────────────────
    scroll    += scrollVel * dt
    scrollVel *= Math.exp(-FRICTION * dt)   // frame-rate-independent friction

    // Hard clamp + kill velocity at the ends
    if (scroll <= 0)     { scroll = 0;     scrollVel = Math.max(0, scrollVel) }
    if (scroll >= N - 1) { scroll = N - 1; scrollVel = Math.min(0, scrollVel) }

    // ── 2. Snap spring ─────────────────────────────────────────────────────
    // When nearly stopped, spring toward the nearest node (or keyboard target).
    if (Math.abs(scrollVel) < SNAP_THRESHOLD) {
      scrollVel = 0
      const target = snapTarget !== null ? snapTarget : Math.round(scroll)
      scroll += (target - scroll) * (1 - Math.exp(-SNAP_SPEED * dt))
      if (snapTarget !== null && Math.abs(scroll - snapTarget) < 0.002) snapTarget = null
    }

    // ── 3. Update UI whenever the nearest node changes ─────────────────────
    const nearestNode = Math.round(scroll)
    if (nearestNode !== activeIndex) {
      activeIndex = nearestNode
      onProjectChange(PROJECTS[activeIndex], activeIndex)
    }

    // ── 4. Camera — pure function of scroll via open CatmullRom spline ─────
    // debugMode suspends this block so DebugPanel can hold manual positions.
    if (!debugMode) {
      // Eased spline parameter: smootherstep the fractional part of scroll so
      // the camera lingers near each waypoint and rushes through the midpoint.
      const i0       = Math.min(Math.floor(scroll), N - 2)
      const frac     = Math.max(0, Math.min(1, scroll - i0))
      const pathT    = (i0 + nodeEase(frac)) / (N - 1)
      camera.position.copy(camCurve.getPoint(pathT))
      controls.target.copy(lookCurve.getPoint(pathT))

      // Subtle FOV breathing: widens during fast movement, contracts at rest
      const speed = Math.abs(scrollVel)
      camera.fov = THREE.MathUtils.lerp(camera.fov, 45 + Math.min(speed, MAX_VEL) * 0.8, 0.08)
      camera.updateProjectionMatrix()
    }

    controls.update()
    renderer.render(scene, camera)
  }

  function start() {
    if (started) return
    started = true
    onProjectChange(PROJECTS[0], 0)
    tick()
    onLoad()
  }

  document.fonts.ready.then(start)
  setTimeout(start, 1800)

  // Expose goToIndex + tune mode API to React
  return {
    goToIndex,

    // ── Tune mode ───────────────────────────────────────────────────────────
    enterTuneMode(onStateChange, onSelect) {
      tuneActive = true
      debugMode  = true
      scrollVel  = 0
      controls.enableZoom     = true
      controls.enablePan      = true
      controls.maxDistance    = 500
      controls.minPolarAngle  = 0
      controls.maxPolarAngle  = Math.PI
      // Left rotates on empty space; tuneGizmos disables orbit on-the-fly when
      // a left press lands on a gizmo sphere or a TransformControls arrow.
      controls.mouseButtons   = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
      tuneGizmoManager = initTuneGizmos(
        scene, camera, renderer, controls,
        cardGroups, extraGroups, paneController, elementGroups,
        onStateChange, onSelect
      )
      onStateChange(tuneGizmoManager.getState())
    },

    exitTuneMode() {
      tuneGizmoManager?.dispose()
      tuneGizmoManager = null
      tuneActive  = false
      debugMode   = false
      scrollVel   = 0
      snapTarget  = null
      controls.enableZoom     = false
      controls.enablePan      = false
      controls.maxDistance    = 50
      controls.minPolarAngle  = Math.PI * 0.1
      controls.maxPolarAngle  = Math.PI * 0.9
      controls.mouseButtons   = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
    },

    setTuneRotY(id, rotY) {
      tuneGizmoManager?.setRotY(id, rotY)
    },

    // Jump camera to a node's gizmo cluster in tune mode
    jumpToTuneNode(camPos, lookAt) {
      if (!tuneActive) return
      camera.position.set(camPos[0], camPos[1], camPos[2])
      controls.target.set(lookAt[0], lookAt[1], lookAt[2])
      controls.update()
    },

    setPaneRot(i, rotY, rotX) {
      paneController?.setPaneRot(i, rotY, rotX)
    },

    // ── Exit animation — zoom toward lookAt, then call onComplete ───────────
    startExitAnimation(onComplete) {
      if (debugMode && tuneActive) return  // don't run during tune mode
      scrollVel = 0
      debugMode = true
      controls.enabled = false

      const startPos = camera.position.clone()
      const target   = controls.target.clone()
      const startFov = camera.fov
      const start    = performance.now()
      const DURATION = 700

      ;(function animateExit() {
        const t    = Math.min((performance.now() - start) / DURATION, 1)
        const ease = t * t * (3 - 2 * t)  // smoothstep

        camera.position.lerpVectors(startPos, target, ease * 0.78)
        camera.lookAt(target)
        camera.fov = THREE.MathUtils.lerp(startFov, startFov - 10, ease)
        camera.updateProjectionMatrix()

        if (t < 1) {
          requestAnimationFrame(animateExit)
        } else {
          onComplete?.()
          controls.enabled = true
          debugMode = false
        }
      })()
    },

    // ── Legacy (kept for DebugPanel removal safety) ─────────────────────────
    getCameraState() {
      return {
        pos: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      }
    },
    setCameraState(pos, target) {
      scroll     = activeIndex
      scrollVel  = 0
      snapTarget = null
      debugMode  = true
      camera.position.set(pos[0], pos[1], pos[2])
      controls.target.set(target[0], target[1], target[2])
      controls.update()
    },
    getCardState(id) {
      const g = cardGroups.get(id)
      if (!g) return null
      return {
        pos: [g.position.x, g.position.y, g.position.z],
        rotY: g.userData.baseRot?.y ?? g.rotation.y,
      }
    },
    setCardState(id, pos, rotY) {
      const g = cardGroups.get(id)
      if (!g) return
      g.position.set(pos[0], pos[1], pos[2])
      g.rotation.y = rotY
      if (g.userData.baseRot) g.userData.baseRot.y = rotY
    },

    destroy() {
      tuneGizmoManager?.dispose()
      cancelAnimationFrame(animId)
      window.removeEventListener('wheel', onWheel)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
