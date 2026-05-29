import { useState, useEffect, useCallback } from 'react'
import { PROJECTS, SCREENSHOT_PANES, SCENE_ELEMENTS } from '../data/projects.js'

// ── Serializer ─────────────────────────────────────────────────────────────

function n(v, decimals = 2) {
  const s = v.toFixed(decimals)
  // strip trailing zeros after decimal point
  return s.includes('.') ? s.replace(/\.?0+$/, '') || '0' : s
}

function fmtNum(v) { return n(v, 4) }
function fmtArr(arr) { return `[${arr.map(v => n(v, 2)).join(', ')}]` }
function fmtStr(v) { return JSON.stringify(v) }

function fmtVal(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return String(v)
  if (typeof v === 'number') return fmtNum(v)
  if (typeof v === 'string') return fmtStr(v)
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]'
    if (v.every(x => typeof x === 'number')) return fmtArr(v)
    if (v.every(x => typeof x === 'string')) return `[${v.map(fmtStr).join(', ')}]`
    if (v.every(x => Array.isArray(x))) {
      const rows = v.map(row => `      [${row.map(fmtStr).join(', ')}]`).join(',\n')
      return `[\n${rows},\n    ]`
    }
    return JSON.stringify(v)
  }
  if (typeof v === 'object') {
    const entries = Object.entries(v).filter(([, val]) => val !== undefined)
    const inner = entries.map(([k, val]) => `${k}: ${fmtVal(val)}`).join(', ')
    return `{ ${inner} }`
  }
  return String(v)
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

// Produce the complete projects.js text from merged state
export function serializeProjectsJs({ projects, screenshotPanes, sceneElements }) {
  const archiveProjects = projects.filter(p => p.isArchive)
  const mainProjects = projects.filter(p => !p.isArchive)

  // 1. ARCHIVE_CARD_LAYOUT
  const layoutLines = archiveProjects.map(p => {
    const fo = sub3(p._camPos, p._pos)
    return `  { pos: ${fmtArr(p._pos)}, focusOffset: ${fmtArr(fo)}, rotY: ${n(p._rotY, 3)} },`
  }).join('\n')

  // 2. SCREENSHOT_PANES
  const paneLines = screenshotPanes.map(pane => {
    const fields = Object.entries(pane).map(([k, v]) => `    ${k}: ${fmtVal(v)},`).join('\n')
    return `  {\n${fields}\n  },`
  }).join('\n')

  // 3. ARCHIVE_WORKS — reconstructed from archive project entries
  const worksLines = archiveProjects.map(p => {
    const href = p.cta?.href ?? null
    const fields = [
      `    title: ${fmtStr(p.title)},`,
      `    sub: ${fmtStr(p.desc)},`,
      `    tag: ${fmtStr(p.tags?.[0] ?? '')},`,
      `    year: ${fmtStr(p.year)},`,
      `    href: ${href ? fmtStr(href) : 'null'},`,
    ].join('\n')
    return `  {\n${fields}\n  },`
  }).join('\n')

  // SCENE_ELEMENTS
  const elementLines = (sceneElements ?? []).map(e =>
    `  { id: ${fmtStr(e.id)}, label: ${fmtStr(e.label)}, pos: ${fmtArr(e._pos ?? e.pos)} },`
  ).join('\n')

  const noCardNode = new Set(['overview', 'about', 'archive'])

  // 4. PROJECTS (non-archive entries)
  const projectLines = mainProjects.map(p => {
    const fo = sub3(p._camPos, p._pos)
    // Build field list preserving order from the original structure
    const lines = []
    lines.push(`    id: ${fmtStr(p.id)},`)
    lines.push(`    index: ${fmtStr(p.index)},`)
    lines.push(`    label: ${fmtStr(p.label)},`)
    lines.push(`    title: ${fmtStr(p.title)},`)
    lines.push(`    desc: ${fmtStr(p.desc)},`)
    lines.push(`    tags: [${(p.tags ?? []).map(fmtStr).join(', ')}],`)
    if (p.image) lines.push(`    image: ${fmtStr(p.image)},`)
    if (p.stats && p.stats.length > 0) {
      const statRows = p.stats.map(row => `      [${row.map(fmtStr).join(', ')}]`).join(',\n')
      lines.push(`    stats: [\n${statRows},\n    ],`)
    } else {
      lines.push(`    stats: [],`)
    }
    lines.push(`    year: ${fmtStr(p.year)},`)
    if (p.cta) {
      lines.push(`    cta: { label: ${fmtStr(p.cta.label)}, href: ${fmtStr(p.cta.href)} },`)
    } else {
      lines.push(`    cta: null,`)
    }
    lines.push(`    pos: ${fmtArr(p._pos)},`)
    lines.push(`    focusOffset: ${fmtArr(fo)},`)
    lines.push(`    lookAt: ${fmtArr(p._lookAt)},`)
    if (p.cardRotY !== undefined && !noCardNode.has(p.id)) lines.push(`    cardRotY: ${n(p.cardRotY ?? p._rotY, 4)},`)
    if (p.isOverview) lines.push(`    isOverview: true,`)
    if (p.isAbout) lines.push(`    isAbout: true,`)
    return `  {\n${lines.join('\n')}\n  },`
  }).join('\n')

  return [
    `const ARCHIVE_CARD_LAYOUT = [`,
    layoutLines,
    `];`,
    ``,
    `export const SCREENSHOT_PANES = [`,
    paneLines,
    `];`,
    ``,
    `export const SCENE_ELEMENTS = [`,
    elementLines,
    `];`,
    ``,
    `export const ARCHIVE_WORKS = [`,
    worksLines,
    `];`,
    ``,
    `export const ARCHIVE_PROJECTS = ARCHIVE_WORKS.map((w, i) => ({`,
    `  id: \`archive-\${i}\`,`,
    `  index: String(i + 6).padStart(2, "0"),`,
    `  label: "Archive",`,
    `  title: w.title,`,
    `  desc: w.sub,`,
    `  tags: [w.tag],`,
    `  stats: [],`,
    `  year: w.year,`,
    `  cta: w.href ? { label: "Open project", href: w.href } : null,`,
    `  pos: ARCHIVE_CARD_LAYOUT[i].pos,`,
    `  focusOffset: ARCHIVE_CARD_LAYOUT[i].focusOffset,`,
    `  archiveRotY: ARCHIVE_CARD_LAYOUT[i].rotY,`,
    `  isArchive: true,`,
    `}));`,
    ``,
    `export const PROJECTS = [`,
    projectLines,
    `  ...ARCHIVE_PROJECTS,`,
    `];`,
    ``,
  ].join('\n')
}

// ── Helpers ────────────────────────────────────────────────────────────────

const NO_CARD_IDS = new Set(['overview', 'about', 'archive'])

function initFormData(editorState) {
  const data = {}
  if (!editorState) return data
  editorState.projects.forEach(p => {
    data[p.id] = {
      index: p.index ?? '',
      label: p.label ?? '',
      title: p.title ?? '',
      desc: p.desc ?? '',
      tags: (p.tags ?? []).join(', '),
      stats: (p.stats ?? []).map(row => ({ val: row[0] ?? '', lbl: row[1] ?? '' })),
      year: p.year ?? '',
      ctaEnabled: !!p.cta,
      ctaLabel: p.cta?.label ?? '',
      ctaHref: p.cta?.href ?? '',
      image: p.image ?? '',
      cardRotY: p._rotY ?? 0,
    }
  })
  editorState.screenshotPanes.forEach((pane, i) => {
    data[`pane-${i}`] = { ...pane }
  })
  ;(editorState.sceneElements ?? []).forEach(e => {
    data[`element-${e.id}`] = { label: e.label ?? '' }
  })
  return data
}

// Merge positional state (from editorState) with metadata (from formData)
function mergeForExport(editorState, formData) {
  const projects = editorState.projects.map(p => {
    const f = formData[p.id] ?? {}
    const tags = typeof f.tags === 'string' ? f.tags.split(',').map(t => t.trim()).filter(Boolean) : p.tags
    const stats = Array.isArray(f.stats) ? f.stats.map(row => [row.val, row.lbl]) : p.stats
    const cta = f.ctaEnabled ? { label: f.ctaLabel, href: f.ctaHref } : null
    return {
      ...p,
      index: f.index ?? p.index,
      label: f.label ?? p.label,
      title: f.title ?? p.title,
      desc: f.desc ?? p.desc,
      tags,
      stats,
      year: f.year ?? p.year,
      cta,
      image: f.image || p.image || undefined,
      cardRotY: f.cardRotY ?? p.cardRotY,
      _rotY: f.cardRotY ?? p._rotY,
    }
  })
  const screenshotPanes = editorState.screenshotPanes.map((pane, i) => {
    const f = formData[`pane-${i}`] ?? {}
    // formData captures pane state at tune-mode enter; its `pos` is stale once
    // the gizmo moves. Take all form-edited fields, but force `pos` from the
    // live editorState pane (gizmo-controlled).
    return { ...pane, ...f, pos: pane.pos }
  })
  const sceneElements = (editorState.sceneElements ?? []).map(e => {
    const f = formData[`element-${e.id}`] ?? {}
    return { ...e, label: f.label ?? e.label }
  })
  return { projects, screenshotPanes, sceneElements }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TxtInput({ label, value, onChange, monospace = false, textarea = false }) {
  const base = `w-full bg-black/60 border border-dim/30 px-2 py-1 text-fg text-[11px] focus:outline-none focus:border-fg/50 ${monospace ? 'font-mono' : ''}`
  return (
    <label className="block mb-2">
      <span className="block text-dim text-[9px] tracking-[0.14em] uppercase mb-0.5">{label}</span>
      {textarea
        ? <textarea className={`${base} resize-y min-h-[3rem]`} value={value} onChange={e => onChange(e.target.value)} />
        : <input className={base} value={value} onChange={e => onChange(e.target.value)} />
      }
    </label>
  )
}

function NumInput({ label, value, onChange, step = 0.1 }) {
  return (
    <label className="block mb-2">
      <span className="block text-dim text-[9px] tracking-[0.14em] uppercase mb-0.5">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(+(value - step).toFixed(4))}
          className="text-dim hover:text-fg w-5 text-[14px] leading-none select-none">−</button>
        <input
          type="number" step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onWheel={e => e.stopPropagation()}
          className="flex-1 bg-black/60 border border-dim/30 px-2 py-1 text-fg text-[11px] font-mono focus:outline-none focus:border-fg/50"
        />
        <button type="button" onClick={() => onChange(+(value + step).toFixed(4))}
          className="text-dim hover:text-fg w-5 text-[14px] leading-none select-none">+</button>
      </div>
    </label>
  )
}

function ProjectForm({ project, formData, onFieldChange, scene }) {
  if (!project || !formData) return null
  const f = formData
  const isArchive = project.isArchive
  const showCard = !NO_CARD_IDS.has(project.id)

  const upd = (key) => (val) => onFieldChange(project.id, key, val)

  const addStat = () => onFieldChange(project.id, 'stats', [...(f.stats ?? []), { val: '', lbl: '' }])
  const removeStat = (i) => onFieldChange(project.id, 'stats', f.stats.filter((_, idx) => idx !== i))
  const updStat = (i, key, val) => {
    const next = f.stats.map((row, idx) => idx === i ? { ...row, [key]: val } : row)
    onFieldChange(project.id, 'stats', next)
  }

  return (
    <div className="p-3 space-y-1">
      {/* Position info (read-only display, gizmos control these) */}
      <div className="mb-3 p-2 bg-black/40 border border-dim/20 text-dim text-[9px] tracking-wide uppercase">
        Position via 3D gizmos · ⬡ cam&nbsp; ●&nbsp;look&nbsp; ●&nbsp;card
      </div>

      {!isArchive && <TxtInput label="index" value={f.index} onChange={upd('index')} monospace />}
      <TxtInput label="label" value={f.label} onChange={upd('label')} />
      <TxtInput label="title" value={f.title} onChange={upd('title')} />
      <TxtInput label="desc" value={f.desc} onChange={upd('desc')} textarea />
      <TxtInput label="tags (comma separated)" value={f.tags} onChange={upd('tags')} monospace />
      <TxtInput label="year" value={f.year} onChange={upd('year')} monospace />

      {/* CTA */}
      <div className="mb-2">
        <label className="flex items-center gap-2 text-[9px] tracking-[0.14em] uppercase text-dim mb-1">
          <input type="checkbox" checked={f.ctaEnabled} onChange={e => upd('ctaEnabled')(e.target.checked)} />
          cta link
        </label>
        {f.ctaEnabled && (
          <div className="pl-4 space-y-1">
            <TxtInput label="label" value={f.ctaLabel} onChange={upd('ctaLabel')} />
            <TxtInput label="href" value={f.ctaHref} onChange={upd('ctaHref')} monospace />
          </div>
        )}
      </div>

      {/* Image */}
      <TxtInput label="image path" value={f.image} onChange={upd('image')} monospace />

      {/* Stats */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-dim text-[9px] tracking-[0.14em] uppercase">stats</span>
          <button type="button" onClick={addStat}
            className="text-dim hover:text-fg text-[10px] border border-dim/30 px-1.5 py-0.5">+ add row</button>
        </div>
        {(f.stats ?? []).map((row, i) => (
          <div key={i} className="flex items-center gap-1 mb-1">
            <input value={row.val} onChange={e => updStat(i, 'val', e.target.value)} placeholder="value"
              className="w-20 bg-black/60 border border-dim/30 px-1.5 py-1 text-fg text-[10px] font-mono focus:outline-none focus:border-fg/50" />
            <input value={row.lbl} onChange={e => updStat(i, 'lbl', e.target.value)} placeholder="label"
              className="flex-1 bg-black/60 border border-dim/30 px-1.5 py-1 text-fg text-[10px] focus:outline-none focus:border-fg/50" />
            <button type="button" onClick={() => removeStat(i)}
              className="text-dim hover:text-fg text-[12px] w-4 leading-none select-none">×</button>
          </div>
        ))}
      </div>

      {/* rotY for card nodes */}
      {showCard && (
        <NumInput
          label="card rotY (rad)"
          value={f.cardRotY ?? 0}
          step={0.05}
          onChange={(v) => { upd('cardRotY')(v); scene?.setTuneRotY(project.id, v) }}
        />
      )}
    </div>
  )
}

function PaneForm({ paneIndex, formData, onPaneFieldChange, scene }) {
  const key = `pane-${paneIndex}`
  const f = formData[key]
  if (!f) return null
  const upd = (field) => (val) => onPaneFieldChange(paneIndex, field, val)
  const updRot = (field) => (val) => {
    onPaneFieldChange(paneIndex, field, val)
    const rotY = field === 'rotY' ? val : (formData[key]?.rotY ?? 0)
    const rotX = field === 'rotX' ? val : (formData[key]?.rotX ?? 0)
    scene?.setPaneRot(paneIndex, rotY, rotX)
  }
  return (
    <div className="p-3 space-y-1">
      <div className="mb-3 p-2 bg-black/40 border border-dim/20 text-dim text-[9px] tracking-wide uppercase">
        Position via 3D gizmos · ● purple
      </div>
      <TxtInput label="src (path)" value={f.src} onChange={upd('src')} monospace />
      <NumInput label="aspect ratio" value={f.aspect} step={0.01} onChange={upd('aspect')} />
      <NumInput label="height" value={f.height} step={0.1} onChange={upd('height')} />
      <NumInput label="rotY (rad)" value={f.rotY} step={0.05} onChange={updRot('rotY')} />
      <NumInput label="rotX (rad)" value={f.rotX} step={0.05} onChange={updRot('rotX')} />
      <NumInput label="phase" value={f.phase} step={0.1} onChange={upd('phase')} />
      <NumInput label="speed" value={f.speed} step={0.05} onChange={upd('speed')} />
    </div>
  )
}

function ElementForm({ elementId, formData, onElementFieldChange }) {
  const key = `element-${elementId}`
  const f = formData[key]
  if (!f) return null
  return (
    <div className="p-3 space-y-1">
      <div className="mb-3 p-2 bg-black/40 border border-dim/20 text-dim text-[9px] tracking-wide uppercase">
        Position via 3D gizmos · ● green
      </div>
      <TxtInput label="label" value={f.label} onChange={(v) => onElementFieldChange(elementId, 'label', v)} />
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TuneMode({
  tuneMode, editorState,
  onEnter, onExit,
  scene, goToIndex,
  activeProject,
  selectedId, onSelectId,
}) {
  const [formData, setFormData] = useState({})
  const [copyFlash, setCopyFlash] = useState(false)

  // Init form data when tune mode is entered / editorState first arrives
  useEffect(() => {
    if (editorState) setFormData(initFormData(editorState))
  }, [!!editorState]) // only re-init on tune mode enter/exit, not every gizmo drag

  // Update formData when a project field changes
  const onFieldChange = useCallback((id, key, val) => {
    setFormData(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }))
  }, [])

  // Update formData when a pane field changes
  const onPaneFieldChange = useCallback((index, key, val) => {
    const k = `pane-${index}`
    setFormData(prev => ({ ...prev, [k]: { ...prev[k], [key]: val } }))
  }, [])

  // Update formData when a scene element field changes
  const onElementFieldChange = useCallback((id, key, val) => {
    const k = `element-${id}`
    setFormData(prev => ({ ...prev, [k]: { ...prev[k], [key]: val } }))
  }, [])

  const copyProjectsJs = useCallback(() => {
    if (!editorState) return
    const merged = mergeForExport(editorState, formData)
    const text = serializeProjectsJs(merged)
    navigator.clipboard.writeText(text).then(() => {
      setCopyFlash(true)
      setTimeout(() => setCopyFlash(false), 1400)
    }).catch(() => {
      // Fallback: create a textarea and copy
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyFlash(true)
      setTimeout(() => setCopyFlash(false), 1400)
    })
  }, [editorState, formData])

  const jumpToNode = useCallback((projectId, index) => {
    onSelectId(projectId)
    goToIndex?.(index)
    const node = editorState?.projects.find(p => p.id === projectId)
    if (node) scene?.jumpToTuneNode(node._camPos, node._lookAt)
  }, [editorState, scene, goToIndex, onSelectId])

  // Determine what form to show based on selectedId
  const isPaneSelected = selectedId?.startsWith('pane-')
  const isElementSelected = selectedId?.startsWith('element-')
  const selectedPaneIndex = isPaneSelected ? parseInt(selectedId.replace('pane-', ''), 10) : -1
  const selectedElementId = isElementSelected ? selectedId.replace('element-', '') : null
  const selectedProject = !isPaneSelected && !isElementSelected
    ? editorState?.projects.find(p => p.id === selectedId)
    : null

  if (!tuneMode) {
    return (
      <button
        type="button"
        onClick={onEnter}
        className="fixed bottom-7 left-1/2 -translate-x-1/2 z-30 bg-black/70 backdrop-blur-sm border border-dim/40 px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-dim hover:text-fg hover:border-fg/60"
      >
        Tune scene
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Top bar */}
      <div className="pointer-events-auto flex items-center gap-3 h-10 bg-black/85 backdrop-blur border-b border-dim/30 px-4 text-[10px] tracking-[0.14em] uppercase">
        <span className="text-fg font-mono">Tune Mode</span>
        <span className="text-dim">·</span>
        {/* Legend */}
        <span className="flex items-center gap-1.5 text-[9px] normal-case tracking-normal">
          <span style={{ color: '#ffdd00' }}>⬡</span><span className="text-dim">cam</span>
          <span style={{ color: '#00eeff' }}>●</span><span className="text-dim">look</span>
          <span style={{ color: '#ff5500' }}>●</span><span className="text-dim">card</span>
          <span style={{ color: '#cc44ff' }}>●</span><span className="text-dim">pane</span>
          <span style={{ color: '#66ff66' }}>●</span><span className="text-dim">element</span>
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={copyProjectsJs}
          className={`px-2 py-1 border text-[10px] tracking-[0.14em] transition-colors ${
            copyFlash
              ? 'border-fg/60 text-fg'
              : 'border-dim/40 text-dim hover:text-fg hover:border-fg/60'
          }`}
        >
          {copyFlash ? 'Copied!' : 'Copy project.js'}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="px-2 py-1 border border-dim/40 text-dim hover:text-fg hover:border-fg/60 text-[10px] tracking-[0.14em]"
        >
          Exit
        </button>
      </div>

      {/* Body */}
      <div className="flex" style={{ height: 'calc(100vh - 40px)' }}>
        {/* Left: Node list */}
        <div className="pointer-events-auto w-52 bg-black/55 backdrop-blur-sm border-r border-dim/20 overflow-y-auto flex-shrink-0">
          {/* Projects */}
          <div className="px-3 pt-2 pb-1 text-[9px] tracking-[0.14em] uppercase text-dim/60">Nodes</div>
          {(editorState?.projects ?? PROJECTS).map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => jumpToNode(p.id, i)}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-mono tracking-normal transition-colors border-b border-dim/10 ${
                selectedId === p.id
                  ? 'bg-fg/10 text-fg border-l-2 border-l-fg/60'
                  : 'text-dim hover:text-fg hover:bg-white/5'
              }`}
            >
              <span className="text-dim/50 mr-1.5">{p.index ?? '—'}</span>{p.id}
            </button>
          ))}
          {/* Screenshot panes */}
          <div className="px-3 pt-3 pb-1 text-[9px] tracking-[0.14em] uppercase text-dim/60">Screenshot Panes</div>
          {(editorState?.screenshotPanes ?? SCREENSHOT_PANES).map((pane, i) => (
            <button
              key={`pane-${i}`}
              type="button"
              onClick={() => onSelectId(`pane-${i}`)}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-mono tracking-normal transition-colors border-b border-dim/10 ${
                selectedId === `pane-${i}`
                  ? 'bg-fg/10 text-fg border-l-2 border-l-fg/60'
                  : 'text-dim hover:text-fg hover:bg-white/5'
              }`}
            >
              <span style={{ color: '#cc44ff' }}>●</span> pane-{i}
            </button>
          ))}
          {/* Scene elements */}
          <div className="px-3 pt-3 pb-1 text-[9px] tracking-[0.14em] uppercase text-dim/60">Scene Elements</div>
          {(editorState?.sceneElements ?? SCENE_ELEMENTS).map((e) => (
            <button
              key={`element-${e.id}`}
              type="button"
              onClick={() => onSelectId(`element-${e.id}`)}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-mono tracking-normal transition-colors border-b border-dim/10 ${
                selectedId === `element-${e.id}`
                  ? 'bg-fg/10 text-fg border-l-2 border-l-fg/60'
                  : 'text-dim hover:text-fg hover:bg-white/5'
              }`}
            >
              <span style={{ color: '#66ff66' }}>●</span> {e.id}
            </button>
          ))}
        </div>

        {/* Center — transparent, lets 3D canvas through */}
        <div className="flex-1 pointer-events-none" />

        {/* Right: Form panel */}
        <div className="pointer-events-auto w-72 bg-black/65 backdrop-blur-sm border-l border-dim/20 overflow-y-auto flex-shrink-0">
          {selectedId === null || selectedId === undefined ? (
            <div className="p-4 text-dim text-[10px] tracking-wide">
              Click a gizmo in the scene or a node in the list to select it.
            </div>
          ) : isPaneSelected && selectedPaneIndex >= 0 ? (
            <>
              <div className="px-3 pt-2 pb-1 border-b border-dim/20 text-[9px] tracking-[0.14em] uppercase text-dim">
                pane-{selectedPaneIndex}
              </div>
              <PaneForm
                paneIndex={selectedPaneIndex}
                formData={formData}
                onPaneFieldChange={onPaneFieldChange}
                scene={scene}
              />
            </>
          ) : isElementSelected && selectedElementId ? (
            <>
              <div className="px-3 pt-2 pb-1 border-b border-dim/20 text-[9px] tracking-[0.14em] uppercase text-dim font-mono">
                {selectedElementId}
              </div>
              <ElementForm
                elementId={selectedElementId}
                formData={formData}
                onElementFieldChange={onElementFieldChange}
              />
            </>
          ) : selectedProject ? (
            <>
              <div className="px-3 pt-2 pb-1 border-b border-dim/20 text-[9px] tracking-[0.14em] uppercase text-dim font-mono">
                {selectedProject.id}
              </div>
              <ProjectForm
                project={selectedProject}
                formData={formData[selectedProject.id]}
                onFieldChange={onFieldChange}
                scene={scene}
              />
            </>
          ) : (
            <div className="p-4 text-dim text-[10px]">No selection.</div>
          )}
        </div>
      </div>
    </div>
  )
}
