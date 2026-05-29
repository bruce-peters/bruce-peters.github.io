import * as THREE from 'three'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { PROJECTS, SCREENSHOT_PANES, SCENE_ELEMENTS } from '../data/projects.js'

// overview has no meaningful 3D object at its pos; all others do
const NO_CARD_IDS = new Set(['overview'])

export function initTuneGizmos(
  scene, camera, renderer, orbitControls,
  cardGroups, extraGroups, paneController, elementGroups,
  onStateChange, onSelect
) {
  // Build initial state from live scene (actual card positions) + PROJECTS data
  const projectState = PROJECTS.map((p) => {
    const g = cardGroups.get(p.id) ?? extraGroups.get(p.id)
    const pos = g
      ? [g.position.x, g.position.y, g.position.z]
      : [...p.pos]
    const rotY = g?.userData.baseRot?.y ?? p.archiveRotY ?? p.cardRotY ?? 0
    const camPos = [
      p.pos[0] + p.focusOffset[0],
      p.pos[1] + p.focusOffset[1],
      p.pos[2] + p.focusOffset[2],
    ]
    const lookAt = p.lookAt ? [...p.lookAt] : [...p.pos]
    return { ...jsonClone(p), _pos: pos, _camPos: camPos, _lookAt: lookAt, _rotY: rotY }
  })

  const paneState = SCREENSHOT_PANES.map(p => ({ ...p }))

  // Scene elements — seed _pos from the live group position when available
  const elementState = SCENE_ELEMENTS.map((e) => {
    const g = elementGroups?.get(e.id)
    const pos = g ? [g.position.x, g.position.y, g.position.z] : [...e.pos]
    return { ...e, _pos: pos }
  })

  const state = { projects: projectState, screenshotPanes: paneState, sceneElements: elementState }

  const emit = () => onStateChange({
    projects: [...state.projects],
    screenshotPanes: [...state.screenshotPanes],
    sceneElements: [...state.sceneElements],
  })

  // ── Gizmo meshes ───────────────────────────────────────────────────────────
  const allAnchors = []
  const pickerMeshes = []
  const connLines = [] // { line, camAnchor, lookAnchor }

  function makeAnchor(worldPos, color, meta) {
    const anchor = new THREE.Object3D()
    anchor.position.set(worldPos[0], worldPos[1], worldPos[2])
    anchor.userData = { ...meta }
    scene.add(anchor)
    allAnchors.push(anchor)

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshBasicMaterial({
        color,
        depthTest: false,
        transparent: true,
        opacity: 0.85,
        fog: false,
      })
    )
    sphere.renderOrder = 999
    sphere.userData = { ...meta, anchor }
    anchor.add(sphere)
    pickerMeshes.push(sphere)
    return anchor
  }

  // Per-project gizmos
  projectState.forEach((p) => {
    const camAnchor  = makeAnchor(p._camPos, 0xffdd00, { type: 'camPos',  projectId: p.id })
    const lookAnchor = makeAnchor(p._lookAt, 0x00eeff, { type: 'lookAt',  projectId: p.id })

    if (!NO_CARD_IDS.has(p.id)) {
      makeAnchor(p._pos, 0xff5500, { type: 'cardPos', projectId: p.id })
    }

    // Connecting line cam → lookAt
    const pts = [
      new THREE.Vector3(...p._camPos),
      new THREE.Vector3(...p._lookAt),
    ]
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
    const line = new THREE.Line(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0x334466, depthTest: false, fog: false })
    )
    line.renderOrder = 998
    scene.add(line)
    connLines.push({ line, camAnchor, lookAnchor })
  })

  // Per-pane gizmos (purple)
  paneState.forEach((pane, i) => {
    makeAnchor(pane.pos, 0xcc44ff, { type: 'panePos', paneIndex: i })
  })

  // Scene element gizmos (green)
  elementState.forEach((e) => {
    makeAnchor(e._pos, 0x66ff66, { type: 'elementPos', elementId: e.id })
  })

  function updateLines() {
    connLines.forEach(({ line, camAnchor, lookAnchor }) => {
      const a = line.geometry.attributes.position
      a.setXYZ(0, camAnchor.position.x, camAnchor.position.y, camAnchor.position.z)
      a.setXYZ(1, lookAnchor.position.x, lookAnchor.position.y, lookAnchor.position.z)
      a.needsUpdate = true
    })
  }

  // ── TransformControls ──────────────────────────────────────────────────────
  // In three r169+, TransformControls extends Controls (not Object3D). The
  // visible/draggable gizmo handles live on a separate helper object that must
  // be added to the scene — adding `tc` itself does nothing.
  const tc = new TransformControls(camera, renderer.domElement)
  tc.setMode('translate')
  tc.setSize(0.8)
  const tcHelper = tc.getHelper()
  scene.add(tcHelper)

  // Re-enable orbit when an axis drag finishes (fires after our pointerup handler)
  tc.addEventListener('dragging-changed', (e) => {
    if (!e.value) orbitControls.enabled = true
  })


  // Sync scene objects + state on every drag frame
  tc.addEventListener('change', () => {
    const obj = tc.object
    if (!obj) return
    const { type, projectId, paneIndex, elementId } = obj.userData
    const wp = [obj.position.x, obj.position.y, obj.position.z]

    if (type === 'camPos') {
      const p = state.projects.find(x => x.id === projectId)
      if (p) p._camPos = wp
    } else if (type === 'lookAt') {
      const p = state.projects.find(x => x.id === projectId)
      if (p) p._lookAt = wp
    } else if (type === 'cardPos') {
      const p = state.projects.find(x => x.id === projectId)
      if (p) {
        p._pos = wp
        const g = cardGroups.get(projectId)
        if (g) g.position.set(wp[0], wp[1], wp[2])
        // Sync any secondary scene group at the same position (e.g. reader animation, about panel)
        const extra = extraGroups.get(projectId)
        if (extra) extra.position.set(wp[0], wp[1], wp[2])
      }
    } else if (type === 'panePos') {
      state.screenshotPanes[paneIndex].pos = wp
      paneController?.setPanePos(paneIndex, wp)
    } else if (type === 'elementPos') {
      const el = state.sceneElements.find(x => x.id === elementId)
      if (el) el._pos = wp
      const g = elementGroups?.get(elementId)
      if (g) g.position.set(wp[0], wp[1], wp[2])
    }

    updateLines()
    emit()
  })

  // ── Click-to-select (capture phase — fires before OrbitControls) ──────────
  // OrbitControls registers its pointerdown listener during construction, so it
  // fires first in bubble phase and calls setPointerCapture(), stealing the
  // pointer before TC can initiate a drag. Using capture phase here lets us
  // inspect the click first and disable OrbitControls when needed.
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()

  function onPointerDown(e) {
    if (e.button !== 0) return
    // Ignore clicks that didn't land on the 3D canvas (e.g. UI overlay buttons)
    if (e.target !== renderer.domElement && !renderer.domElement.contains(e.target)) return
    if (tc.dragging) return
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)

    // Pressing on a picker sphere → select it; suppress orbit so it doesn't rotate.
    const hits = raycaster.intersectObjects(pickerMeshes)
    if (hits.length > 0) {
      orbitControls.enabled = false
      const { type, projectId, paneIndex, elementId, anchor } = hits[0].object.userData
      tc.attach(anchor)
      const selId = type === 'panePos' ? `pane-${paneIndex}`
        : type === 'elementPos' ? `element-${elementId}`
        : projectId
      onSelect?.(selId, type)
      highlightSelected(anchor)
    } else if (tc.axis !== null) {
      // Pressing on a TC arrow handle (hover set tc.axis) → let TC drag, no orbit.
      orbitControls.enabled = false
    }
    // Otherwise: empty space → leave orbit enabled so left-drag rotates the view.
    // Current selection is kept so you don't lose the gizmo while orbiting.
  }

  function onPointerUp(e) {
    if (e.button !== 0) return
    // Re-enable orbit unless a TC axis drag is still in progress (drag end is
    // handled by dragging-changed, which fires after this capture-phase handler).
    if (!tc.dragging) orbitControls.enabled = true
  }

  // Register on window capture so we fire before TC's canvas listener,
  // ensuring sphere selection attaches TC before TC's own pointerdown fires
  window.addEventListener('pointerdown', onPointerDown, { capture: true })
  window.addEventListener('pointerup', onPointerUp, { capture: true })

  // Visual highlight: scale up selected picker sphere
  let currentHighlight = null
  function highlightSelected(anchor) {
    if (currentHighlight) {
      const prev = currentHighlight.children[0]
      if (prev) prev.scale.setScalar(1)
    }
    currentHighlight = anchor
    const sphere = anchor?.children[0]
    if (sphere) sphere.scale.setScalar(1.5)
  }
  function clearHighlight() {
    if (currentHighlight) {
      const sphere = currentHighlight.children[0]
      if (sphere) sphere.scale.setScalar(1)
      currentHighlight = null
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    getState() {
      return {
        projects: [...state.projects],
        screenshotPanes: [...state.screenshotPanes],
        sceneElements: [...state.sceneElements],
      }
    },

    setRotY(id, rotY) {
      const p = state.projects.find(x => x.id === id)
      if (!p) return
      p._rotY = rotY
      const g = cardGroups.get(id)
      if (g) {
        g.rotation.y = rotY
        if (g.userData.baseRot) g.userData.baseRot.y = rotY
      }
      emit()
    },

    dispose() {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true })
      window.removeEventListener('pointerup', onPointerUp, { capture: true })
      orbitControls.enabled = true
      tc.detach()
      scene.remove(tcHelper)
      tc.dispose()
      allAnchors.forEach(a => scene.remove(a))
      connLines.forEach(({ line }) => {
        scene.remove(line)
        line.geometry.dispose()
      })
    },
  }
}

function jsonClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}
