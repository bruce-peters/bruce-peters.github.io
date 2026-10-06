import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

// The AdvantageScope CAD exports carry no real surface data. Every material
// comes out as polished metal (metalness 1, roughness 0.21), carpet included,
// and a polished-metal floor is a mirror that throws the environment map's
// ceiling panels back as a bright white blob. Replace that with plausible
// finishes: painted/plastic parts are rough dielectrics, flat floor pieces
// (carpet, tape lines) are fully matte, and polycarbonate stays glossy.
const cadMaterials = () => ({
  name: 'bp_cad_materials',
  afterRoot(gltf) {
    const root = gltf.scene
    root.updateMatrixWorld(true)
    const size = new THREE.Vector3()
    root.traverse((child) => {
      if (!child.isMesh || !child.material?.isMeshStandardMaterial) return
      const mat = child.material
      mat.metalness = 0
      if (mat.transparent) return
      // The fast box contains the precise one, so a flat fast box is truly flat.
      new THREE.Box3().setFromObject(child).getSize(size)
      const isFloor = size.y < 0.02 * Math.max(size.x, size.z)
      mat.roughness = isFloor ? 1 : 0.6
    })
  },
})

// Every GLB in public/models is meshopt-compressed by scripts/optimize-models.mjs,
// so all loaders need the decoder attached.
export function createGLTFLoader(manager) {
  return new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).register(cadMaterials)
}
