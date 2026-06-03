import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { PROJECTS, SCENE_ELEMENTS } from '../data/projects.js'
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
  renderer.setClearColor(0x101012, 1)
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
  scene.background = new THREE.Color(0x101012)
  scene.fog = new THREE.Fog(0x101012, 50, 120)
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
  controls.enableRotate = false   // background is scroll-driven; re-enabled only in tune mode
  controls.minDistance = 6
  controls.maxDistance = 50
  controls.maxPolarAngle = Math.PI * 0.9
  controls.minPolarAngle = Math.PI * 0.1
  const _overviewLookAt = _overview.lookAt ?? _overview.pos
  controls.target.set(_overviewLookAt[0], _overviewLookAt[1], _overviewLookAt[2])

  // Lights — design-system palette: warm cream ambient only, kept deliberately
  // dim so the field reads dark and moody, lit by the environment map.
  scene.add(new THREE.AmbientLight(0xf4f0e8, 0.02))

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

  // Helper: add a slim project card if one was built (skipped when imageless)
  function addCard(p, opts) {
    const g = buildProjectCard(p, opts)
    if (!g) return
    scene.add(g); allUpdaters.push(g.userData.update)
    cardGroups.set(p.id, g)
  }

  // FRC card — right side of arena, face pointing left toward arena (-X)
  addCard(roboticsP, { rotY: roboticsP.cardRotY ?? -Math.PI / 2 })

  // 2025 robot card — same layout as main robotics card, positioned next to the 2025 field
  addCard(robot2025P, { rotY: robot2025P.cardRotY ?? -Math.PI / 2 })

  // Sim card — left side of arena, face pointing right toward arena (+X)
  addCard(simP, { rotY: simP.cardRotY ?? Math.PI / 2 })

  // Scouting card
  addCard(scoutingP, { rotY: scoutingP.cardRotY ?? 0 })

  // Reader (Word Wiz AI) card — pos and rotY come from projects.js data
  addCard(readerP, { rotY: readerP.cardRotY ?? 0 })

  // Archive corridor — floor-disc gate + git commit graph. Each archive work is
  // a commit node; the node for the project the camera is parked on lights up,
  // so we feed the graph the active project id every frame.
  const archive = buildArchive()
  scene.add(archive)
  allUpdaters.push((t) => archive.userData.update(t, PROJECTS[activeIndex]?.id))
  extraGroups.set('archive', archive)

  // Screenshot panes (load async — silently skip missing files)
  paneController = buildScreenshotPanes(scene, allUpdaters)

  // ── Scroll-driven camera ───────────────────────────────────────────────────
  // scroll      : float position in [0, N-1] — drives the camera (eased toward target)
  // scrollTarget: where the document scroll wants the camera to be (set via setScroll)
  // activeIndex : the "current" node for UI (= Math.round(scroll), updated each frame)
  //
  // Design (new layout): the page is a normal scrolling document. React maps the
  // viewport position to a node-float and calls setScroll(); here we just ease
  // `scroll` toward that target so the background camera glides between projects.
  // ─────────────────────────────────────────────────────────────────────────
  let scroll       = 0.0
  let scrollTarget = 0.0
  let activeIndex  = 0
  let debugMode    = false  // true while manual camera control is active (tune/exit)

  const N        = PROJECTS.length
  const SCROLL_LERP = 5.0     // exp ease toward scrollTarget (higher = snappier)
  const PARALLAX = 0.3        // world-unit camera offset from mouse position
  let   mouseX = 0, mouseY = 0   // normalized [-1, 1]

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

  // setScroll — React drives this from the document scroll position.
  // nodeFloat ∈ [0, N-1]; the camera eases toward it in tick().
  function setScroll(nodeFloat) {
    if (tuneActive) return
    debugMode = false
    scrollTarget = Math.max(0, Math.min(N - 1, nodeFloat))
  }

  // goToIndex — kept for API compatibility; snaps the target (used by exit/legacy).
  function goToIndex(i, opts = {}) {
    const next = Math.max(0, Math.min(N - 1, i))
    scroll = next
    scrollTarget = next
    if (next !== activeIndex || opts.force) {
      activeIndex = next
      onProjectChange(PROJECTS[next], next)
    }
  }

  // Subtle mouse parallax — gives the fixed background life without hijacking scroll.
  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1
    mouseY = (e.clientY / window.innerHeight) * 2 - 1
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })

  // Drag cursor (only meaningful in tune mode, where the canvas grabs pointer events)
  renderer.domElement.addEventListener('pointerdown', () => tuneActive && container.classList.add('dragging'))
  renderer.domElement.addEventListener('pointerup', () => container.classList.remove('dragging'))
  renderer.domElement.addEventListener('pointerleave', () => container.classList.remove('dragging'))

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

    // ── 1. Ease `scroll` toward the document-driven target ─────────────────
    const prevScroll = scroll
    scroll += (scrollTarget - scroll) * (1 - Math.exp(-SCROLL_LERP * dt))
    if (Math.abs(scrollTarget - scroll) < 0.0005) scroll = scrollTarget

    // ── 2. Update UI whenever the nearest node changes ─────────────────────
    const nearestNode = Math.round(scroll)
    if (nearestNode !== activeIndex) {
      activeIndex = nearestNode
      onProjectChange(PROJECTS[activeIndex], activeIndex)
    }

    // ── 3. Camera — pure function of scroll via open CatmullRom spline ─────
    // debugMode suspends this block so tune/exit can hold manual positions.
    if (!debugMode) {
      // Eased spline parameter: ease the fractional part of scroll so the
      // camera lingers near each waypoint and glides through the midpoint.
      const i0       = Math.min(Math.floor(scroll), N - 2)
      const frac     = Math.max(0, Math.min(1, scroll - i0))
      const pathT    = (i0 + nodeEase(frac)) / (N - 1)
      camera.position.copy(camCurve.getPoint(pathT))
      controls.target.copy(lookCurve.getPoint(pathT))

      // Subtle mouse parallax around the spline point
      camera.position.x += mouseX * PARALLAX
      camera.position.y += -mouseY * PARALLAX

      // Gentle FOV breathing: widens while the camera is moving, settles at rest
      const speed = Math.abs(scroll - prevScroll) / Math.max(dt, 0.001)
      camera.fov = THREE.MathUtils.lerp(camera.fov, 45 + Math.min(speed, 1.5) * 0.8, 0.08)
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

  // Expose scroll control + tune mode API to React
  return {
    goToIndex,
    setScroll,

    // ── Tune mode ───────────────────────────────────────────────────────────
    enterTuneMode(onStateChange, onSelect) {
      tuneActive = true
      debugMode  = true
      document.body.style.overflow = 'hidden'   // lock page scroll so wheel zooms the scene
      container.classList.add('tune-active')     // re-enable pointer events on the canvas
      controls.enableZoom     = true
      controls.enablePan      = true
      controls.enableRotate   = true
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
      document.body.style.overflow = ''           // restore page scroll
      container.classList.remove('tune-active', 'dragging')
      controls.enableZoom     = false
      controls.enablePan      = false
      controls.enableRotate   = false
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
      scroll       = activeIndex
      scrollTarget = activeIndex
      debugMode    = true
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
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', onResize)
      document.body.style.overflow = ''
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
