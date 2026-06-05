import * as THREE from 'three'
import { subsystemChipTexture } from './textures.js'

// "The Robot's Mind" — a billboarding tower of subsystem state pills that floats
// above the replayed robot. One pill per subsystem ("ELEVATOR  INTAKE"), each
// showing that mechanism's *current* commanded state, updated live as the robot
// drives. Sprites auto-face the camera, and a pure local +Y offset is invariant
// under the robot's yaw, so the stack stays directly overhead through its path.
//
//   const tower = createStateTower(robotGroup, ['Elevator', 'Pivot', 'Swerve'])
//   // each frame:
//   tower.update({ Elevator: row.elev_state, Pivot: row.pivot_state, Swerve: row.swerve_state })
export function createStateTower(parent, labels, opts = {}) {
  const topY    = opts.topY    ?? 2.6    // local-Y of the top pill, above the robot
  const spacing = opts.spacing ?? 0.42   // vertical gap between pills
  const height  = opts.height  ?? 0.34   // pill world height

  const group = new THREE.Group()
  parent.add(group)

  const chips = labels.map((label, i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      transparent: true, depthWrite: false,
    }))
    sprite.position.set(0, topY - i * spacing, 0)
    sprite.visible = false
    group.add(sprite)
    return { label, sprite, state: null, aspect: 1, pop: 0 }
  })

  // Each distinct (label, state) pill texture is generated once and reused —
  // the set of states per subsystem is small and fixed, so this stays off the
  // per-frame path; we only regenerate when a subsystem actually changes state.
  const cache = new Map()
  function texFor(label, state) {
    const key = label + '|' + state
    let entry = cache.get(key)
    if (!entry) { entry = subsystemChipTexture(label, state); cache.set(key, entry) }
    return entry
  }

  // states: { [label]: stateString }. Cheap to call every frame.
  function update(states) {
    for (const chip of chips) {
      const s = states[chip.label]
      if (s == null || s === '') { chip.sprite.visible = false; continue }
      if (s !== chip.state) {
        chip.state = s
        const { tex, aspect } = texFor(chip.label, s)
        chip.sprite.material.map = tex
        chip.sprite.material.needsUpdate = true
        chip.aspect = aspect
        chip.sprite.visible = true
        chip.pop = 1   // pulse on change
      }
      // Settle the pulse: a brief scale bump that lerps back to resting size.
      chip.pop += (0 - chip.pop) * 0.15
      const h = height * (1 + 0.14 * chip.pop)
      chip.sprite.scale.set(h * chip.aspect, h, 1)
    }
  }

  function reset() {
    for (const chip of chips) { chip.state = null; chip.sprite.visible = false }
  }

  return { group, update, reset }
}
