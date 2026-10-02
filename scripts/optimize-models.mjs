// Build-time script: optimizes the source GLBs in assets-src/models/ and writes
// web-ready copies to public/models/ (same relative paths).
//
// The AdvantageScope exports are CAD dumps: thousands of tiny meshes (one draw
// call each) with uncompressed float geometry. This pipeline:
//   1. removes staged game pieces the scene never shows (the same nodes
//      builders.js used to strip at runtime)
//   2. dedups, flattens the node tree and joins primitives that share a
//      material, so draw calls drop from thousands to roughly one per material
//   3. welds, simplifies within a tiny error budget, then quantizes + meshopt-compresses
//      (EXT_meshopt_compression; GLTFLoader decodes it via MeshoptDecoder)
//
// Usage: node scripts/optimize-models.mjs            (all models)
//        node scripts/optimize-models.mjs field.glb  (one model, path under assets-src/models)

import { mkdirSync, readdirSync, statSync, existsSync } from 'fs'
import { resolve, dirname, relative, join as joinPath } from 'path'
import { fileURLToPath } from 'url'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, flatten, join, weld, simplify, meshopt, prune } from '@gltf-transform/functions'
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(__dirname, '../assets-src/models')
const OUT = resolve(__dirname, '../public/models')

// Per-model settings, keyed by path relative to assets-src/models.
//   strip:    nodes/meshes whose name matches are removed with their subtree
//   simplify: meshoptimizer error budget (fraction of mesh radius); omit = lossless
// The CAD exports are heavily over-tessellated, so even these tiny budgets
// (a few mm on a ~12 m field) cut the triangle count by 3–5×.
const CONFIG = {
  'field.glb':              { strip: /fuel/i, simplify: 0.0005 },
  'field2025.glb':          { strip: /GE-2550[01]|^algae$/i, simplify: 0.0005 },
  'robot.glb':              { simplify: 0.001 },
  'Robot_Reefer/model.glb': { simplify: 0.001 },
  'Robot_Reefer/model_0.glb': { simplify: 0.001 },
  'Robot_Reefer/model_1.glb': { simplify: 0.001 },
}

function listGlbs(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = joinPath(dir, name)
    if (statSync(p).isDirectory()) return listGlbs(p)
    return name.endsWith('.glb') ? [p] : []
  })
}

function stripNodes(doc, pattern) {
  let removed = 0
  const disposeTree = (node) => {
    node.listChildren().forEach(disposeTree)
    node.dispose()
  }
  for (const node of doc.getRoot().listNodes()) {
    if (node.isDisposed()) continue
    const mesh = node.getMesh()
    if (pattern.test(node.getName()) || (mesh && pattern.test(mesh.getName()))) {
      disposeTree(node)
      removed++
    }
  }
  return removed
}

function stats(doc) {
  let prims = 0, tris = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      prims++
      const idx = prim.getIndices()
      tris += (idx ? idx.getCount() : prim.getAttribute('POSITION').getCount()) / 3
    }
  }
  return { prims, tris: Math.round(tris) }
}

await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

const only = process.argv[2]
const files = only ? [resolve(SRC, only)] : listGlbs(SRC)

for (const file of files) {
  if (!existsSync(file)) { console.error(`missing: ${file}`); process.exitCode = 1; continue }
  const rel = relative(SRC, file).replaceAll('\\', '/')
  const cfg = CONFIG[rel] ?? {}
  const doc = await io.read(file)
  const before = stats(doc)

  const stripped = cfg.strip ? stripNodes(doc, cfg.strip) : 0
  const steps = [
    prune(),
    dedup(),
    flatten(),
    join({ keepNamed: false }),
    weld(),
  ]
  if (cfg.simplify) steps.push(simplify({ simplifier: MeshoptSimplifier, error: cfg.simplify }))
  // 16-bit positions: after join one mesh spans the whole ~22 m field, and the
  // default 14 bits (~1.4 mm steps) snaps floor tape lines into the carpet.
  steps.push(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16 }))
  await doc.transform(...steps)

  const after = stats(doc)
  const outFile = resolve(OUT, rel)
  mkdirSync(dirname(outFile), { recursive: true })
  await io.write(outFile, doc)
  const mb = (p) => (statSync(p).size / 1e6).toFixed(1)
  console.log(
    `${rel.padEnd(26)} ${mb(file).padStart(5)} MB → ${mb(outFile).padStart(5)} MB · ` +
    `draws ${before.prims} → ${after.prims} · tris ${before.tris} → ${after.tris}` +
    (stripped ? ` · stripped ${stripped} nodes` : '')
  )
}
