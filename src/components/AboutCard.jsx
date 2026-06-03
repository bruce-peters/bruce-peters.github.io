import useInView from '../hooks/useInView.js'
import { chipDot } from '../utils/chipColors.js'

// The About card — a richer variant of ProjectCard. Keeps the same glass shell
// and glass-settle entrance, but adds an identity band (optional portrait +
// name/role/now), a human-voice headline, the tech-chip row, a 4-stat grid, and
// two CTAs. The 3D `buildAbout()` companion carries identity + work, not skills.
export default function AboutCard({ project, side, onViewWork }) {
  const [ref, inView] = useInView()
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const shown = inView || reduce
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
      {/* colored top bar — the brand-green accent */}
      <span
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: '#57d36a', boxShadow: '0 0 16px rgba(87,211,106,0.5)' }}
      />

      {/* Kicker */}
      <div className="flex justify-between items-baseline mb-5 font-mono">
        <span className="text-[11px] tracking-[0.2em] uppercase text-dim">
          <span className="text-accent">// about</span> · {project.label}
        </span>
      </div>

      {/* Identity band — portrait (optional) + name / role / now */}
      <div className="flex items-center gap-5 mb-5 max-[360px]:flex-col max-[360px]:items-start">
        {project.photo && (
          <div className="shrink-0 w-[118px] rounded-[14px] overflow-hidden border border-line bg-ink-800 shadow-2xl">
            {/* terminal bar */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 bg-ink-700 border-b border-line">
              <i className="w-[7px] h-[7px] rounded-full bg-magenta" />
              <i className="w-[7px] h-[7px] rounded-full bg-lime" />
              <i className="w-[7px] h-[7px] rounded-full bg-accent" />
              <span className="ml-1.5 font-mono text-[9.5px] text-dim2 tracking-wide truncate">
                ~/bruce/portrait.jpg
              </span>
            </div>
            {/* photo + phosphor treatment */}
            <div className="relative aspect-[4/5]">
              <img
                src={project.photo}
                alt="Bruce Peters"
                className="w-full h-full object-cover"
                style={{ filter: 'grayscale(1) contrast(1.1) brightness(1.05)' }}
              />
              <span
                className="absolute inset-0 pointer-events-none mix-blend-screen"
                style={{
                  background:
                    'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.22) 50%) 0 0 / 100% 3px,' +
                    'linear-gradient(0deg, rgba(87,211,106,0.35), transparent 70%)',
                }}
              />
            </div>
          </div>
        )}

        <div className="min-w-0">
          <p className="font-display font-extrabold text-[25px] leading-none tracking-[-0.02em] m-0 mb-2.5 text-fg">
            {project.name}
          </p>
          <p className="font-mono text-[11px] text-dim leading-[1.5] m-0 mb-2 whitespace-pre-line">
            {project.role}
          </p>
          <p className="font-mono text-[11px] text-dim2 flex items-center gap-2 m-0">
            <span
              className={`w-[7px] h-[7px] rounded-full bg-accent shrink-0 ${reduce ? '' : 'animate-pulse2'}`}
              style={{ boxShadow: '0 0 8px #57d36a' }}
            />
            <b className="text-cream-dim font-medium">now —</b> {project.now}
          </p>
        </div>
      </div>

      {/* Headline — human voice; <em> renders accent green, upright */}
      <h2
        className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.0] tracking-[-0.02em] text-fg m-0 mb-4 text-balance [&_em]:not-italic [&_em]:text-accent"
        dangerouslySetInnerHTML={{ __html: project.headline }}
      />

      {/* Bio */}
      <p className="text-[13.5px] leading-[1.62] text-cream-dim m-0 mb-5">
        {project.desc}
      </p>

      {/* Tech chips */}
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

      {/* 4-stat grid — only the lead stat is accent green */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {project.stats.map(([v, l], i) => (
          <div
            key={l}
            className="flex-1 min-w-[100px] border border-line rounded-[14px] px-[18px] py-4 bg-[rgba(22,22,25,0.66)] backdrop-blur-sm"
          >
            <div
              className={`font-display font-extrabold text-[clamp(26px,3vw,34px)] leading-none tracking-[-0.02em] ${i === 0 ? 'text-accent' : 'text-fg'}`}
            >
              {v}
            </div>
            <div className="font-mono text-[10.5px] tracking-[0.1em] uppercase text-dim2 mt-2">
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => onViewWork?.()}
          className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] rounded-full px-[22px] py-3 bg-accent text-bg transition-all duration-200 hover:-translate-y-px hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)] border-0 cursor-pointer after:content-['→']"
        >
          view work
        </button>
        <a
          href="mailto:brucebpeters12@gmail.com"
          className="inline-flex items-center font-mono font-bold text-[13px] tracking-[0.02em] rounded-full px-[22px] py-3 border border-line text-fg transition-all duration-200 hover:-translate-y-px hover:border-accent hover:text-accent no-underline"
        >
          get in touch
        </a>
      </div>
    </div>
  )
}
