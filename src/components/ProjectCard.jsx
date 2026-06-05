import useInView from '../hooks/useInView.js'
import useMagnetic from '../hooks/useMagnetic.js'
import { chipDot } from '../utils/chipColors.js'

// In-flow project card for the scrolling-page layout. Sits in a side column over
// the fixed 3D background; the background frames the matching project as it scrolls in.
export default function ProjectCard({ project, side, onExternalLink }) {
  if (!project) return null
  const kicker = project.isAbout ? 'about' : `work ${project.index}`
  const [ref, inView] = useInView()
  const ctaRef = useMagnetic(0.25)
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const shown = inView || reduce

  // Glass settle: the card focuses in from a slight blur + scale, drifting up
  // and sliding in from its own side so the entrance echoes the alternating layout.
  const slideX = side === 'right' ? 24 : -24

  return (
    <div
      ref={ref}
      className="relative overflow-hidden border border-line rounded-[14px] px-7 py-6 shadow-2xl"
      style={{
        background: 'rgba(22,22,25,0.82)',
        backdropFilter: 'blur(22px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.2)',
        opacity: shown ? 1 : 0,
        filter: shown ? 'blur(0px)' : 'blur(8px)',
        transform: shown
          ? 'translate3d(0, 0, 0) scale(1)'
          : `translate3d(${slideX}px, 28px, 0) scale(0.94)`,
        transition: reduce
          ? 'none'
          : 'opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 800ms cubic-bezier(0.22,1,0.36,1), filter 700ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'opacity, transform, filter',
      }}
    >
      {/* colored top bar — ties the card to the phoneme accent */}
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: '#57d36a', boxShadow: '0 0 16px rgba(87,211,106,0.5)' }}
      />

      {/* Screenshot banner — archive cards carry their imagery in the DOM
          (the main project cards are rendered in the 3D scene instead) */}
      {project.isArchive && project.image && (
        <div className="-mx-7 -mt-6 mb-5 overflow-hidden border-b border-line">
          <img
            src={project.image}
            alt={`${project.title} screenshot`}
            loading="lazy"
            className="block w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Kicker row */}
      <div className="flex justify-between items-baseline mb-4 font-mono">
        <span className="text-[11px] tracking-[0.2em] uppercase text-dim">
          <span className="text-accent">// {kicker}</span> · {project.label}
        </span>
        {project.year && (
          <span className="text-[11px] tracking-[0.2em] uppercase text-dim2 whitespace-nowrap pl-3">
            {project.year}
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="font-display font-bold text-[clamp(28px,3.4vw,38px)] m-0 mb-3 leading-[1.04] tracking-[-0.02em] text-fg">
        {project.title}
      </h2>

      {/* Description */}
      <p className="text-[13.5px] leading-[1.62] text-cream-dim m-0 mb-5">
        {project.desc}
      </p>

      {/* Tech chips — pill + colored dot ties tech to a phoneme */}
      {project.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {project.tags.map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] uppercase text-dim border border-line rounded-full px-2.5 py-1"
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${chipDot(t)}`} />
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Stats — bordered readout boxes (/bp/ .stat spec); only the lead stat
          carries the accent, the rest stay cream so one number leads the eye */}
      {project.stats?.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-5">
          {project.stats.map(([val, lbl], i) => (
            <div
              key={lbl}
              className="flex-1 min-w-[92px] border border-line rounded-[14px] px-4 py-3.5 bg-[rgba(22,22,25,0.66)] backdrop-blur-sm"
            >
              <div
                className={`font-display font-extrabold text-[clamp(22px,2.6vw,28px)] leading-none tracking-[-0.02em] ${i === 0 ? 'text-accent' : 'text-fg'}`}
              >
                {val}
              </div>
              <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-dim2 mt-2">
                {lbl}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions — primary green pill + ghost pill (/bp/ .btn spec): mono 13px,
          pill radius, glow + lift on hover */}
      {(project.cta || project.repo) && (
        <div className="flex items-center gap-3 flex-wrap">
          {project.cta && (
            <button
              ref={ctaRef}
              onClick={() => onExternalLink?.(project.cta.href)}
              className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] text-bg bg-accent rounded-full px-[22px] py-2.5 transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)] border-0 cursor-pointer after:content-['→']"
            >
              {project.cta.label}
            </button>
          )}
          {project.repo && (
            <button
              onClick={() => onExternalLink?.(project.repo)}
              className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] text-cream bg-transparent border border-line rounded-full px-[22px] py-2.5 transition-all duration-200 hover:-translate-y-px hover:border-accent hover:text-accent cursor-pointer"
            >
              GitHub
            </button>
          )}
        </div>
      )}
    </div>
  )
}
