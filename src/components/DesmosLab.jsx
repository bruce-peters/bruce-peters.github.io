import { useCallback, useState } from 'react'
import { DESMOS_GRAPHS } from '../data/desmos.js'
import useInView from '../hooks/useInView.js'
import { play } from '../lib/audio.js'
import DesmosModal from './DesmosModal.jsx'

// The "desmos lab" node: header plus a grid of graph tiles. The featured graph
// (Neural Net) takes a 2×2 block, which fills the grid exactly at 3 columns
// (md) and 5 columns (lg). Clicking a tile opens the live graph in a modal.
export default function DesmosLab({ project }) {
  const [ref, inView] = useInView({ threshold: 0.08 })
  const [openSlug, setOpenSlug] = useState(null)
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const shown = inView || reduce

  const open = useCallback((slug) => { play('tick'); setOpenSlug(slug) }, [])
  const close = useCallback(() => setOpenSlug(null), [])
  const openGraph = DESMOS_GRAPHS.find(g => g.slug === openSlug) ?? null

  return (
    <div ref={ref} className="w-full">
      {/* Header — copy lives on the PROJECTS node so resume mode shares it */}
      <div
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-7"
        style={{
          opacity: shown ? 1 : 0,
          transform: shown ? 'none' : 'translate3d(0, 14px, 0)',
          transition: reduce ? 'none' : 'opacity 380ms cubic-bezier(0.22,1,0.36,1), transform 460ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div className="max-w-[600px]">
          <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent m-0 mb-3">
            // desmos lab · work {project.index}
          </p>
          <h2 className="font-display font-extrabold text-[clamp(32px,4.6vw,56px)] m-0 mb-3 leading-[1.0] tracking-[-0.02em] text-fg">
            {project.title}
          </h2>
          <p className="text-[15px] leading-[1.6] text-cream-dim m-0">
            {project.desc}
          </p>
        </div>
        {project.stats?.length > 0 && (
          <div className="flex gap-7 shrink-0">
            {project.stats.map(([val, lbl], i) => (
              <div key={lbl} className="flex flex-col gap-1">
                <b className={`font-display text-[30px] font-bold leading-none tracking-[-0.02em] ${i === 0 ? 'text-accent' : 'text-fg'}`}>
                  {val}
                </b>
                <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-dim2">
                  {lbl}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {DESMOS_GRAPHS.map((g, i) => (
          <GraphTile
            key={g.slug}
            graph={g}
            onOpen={open}
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? 'none' : 'translate3d(0, 16px, 0)',
              transition: reduce
                ? 'none'
                : `opacity 380ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 40}ms, transform 460ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 40}ms`,
            }}
          />
        ))}
      </div>

      <DesmosModal graph={openGraph} onClose={close} />
    </div>
  )
}

function GraphTile({ graph, onOpen, style }) {
  const featured = graph.featured

  return (
    <button
      type="button"
      onClick={() => onOpen(graph.slug)}
      aria-label={`Run ${graph.title} live`}
      className={`group relative flex flex-col text-left p-0 overflow-hidden border border-line rounded-[14px] cursor-pointer transition-[border-color,box-shadow] duration-[240ms] hover:border-accent hover:shadow-[0_0_0_1px_rgba(87,211,106,0.25),0_10px_40px_rgba(87,211,106,0.18)] focus-visible:outline-none focus-visible:border-accent ${featured ? 'col-span-2 md:row-span-2' : ''}`}
      style={{ background: 'rgba(22,22,25,0.92)', ...style }}
    >
      <div className={`relative w-full overflow-hidden bg-ink-900 ${featured ? 'aspect-[3/2] md:aspect-auto md:flex-1' : 'aspect-[3/2]'}`}>
        <img
          src={graph.image}
          alt={`${graph.title} running in Desmos`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[480ms] ease-out group-hover:scale-[1.04]"
        />
        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase text-bg bg-accent rounded-full px-2.5 py-1 opacity-0 translate-y-[-2px] transition-all duration-[240ms] group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100">
          ▶ run
        </span>
      </div>

      <div className={featured ? 'px-5 py-4' : 'px-3 py-2.5'}>
        <div className="flex items-baseline justify-between gap-2">
          <span className={`font-display font-semibold leading-tight tracking-[-0.01em] text-fg ${featured ? 'text-[22px]' : 'text-[14.5px]'}`}>
            {graph.title}
          </span>
          {featured && (
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-dim2 whitespace-nowrap">
              {graph.year}
            </span>
          )}
        </div>
        {featured && (
          <p className="text-[13.5px] leading-[1.55] text-cream-dim m-0 mt-2">
            {graph.blurb}
          </p>
        )}
        <div className={`font-mono tracking-[0.14em] uppercase text-dim2 ${featured ? 'text-[10px] mt-3' : 'text-[9.5px] mt-1'}`}>
          {graph.tag}
        </div>
      </div>
    </button>
  )
}
