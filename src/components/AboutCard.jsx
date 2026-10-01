import useInView from '../hooks/useInView.js'
import useMagnetic from '../hooks/useMagnetic.js'
import { chipDot } from '../utils/chipColors.js'
import GitHubStats from './GitHubStats.jsx'

// The About card — a richer variant of ProjectCard. Keeps the same glass shell
// and glass-settle entrance, but adds an identity band (optional portrait +
// name/now), a human-voice headline, the language-chip row, a stat grid, and
// the CTAs. The 3D `buildAbout()` companion only adds the portrait and two
// engineering stat tiles, so nothing here should be repeated over there.

// Secondary CTA — filled ink pill, medium weight, dimmer text. Sits beside the
// solid green primary without competing with it; warms to cream + a faint
// green edge on hover.
const SECONDARY_BTN =
  'inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-medium text-[12.5px] leading-4 tracking-[0.02em] rounded-full px-4 py-2.5 bg-ink-700 border border-line text-cream-dim transition-colors duration-200 hover:text-fg hover:border-accent/50 hover:bg-ink-600 no-underline'

export default function AboutCard({ project, side, onViewWork }) {
  const [ref, inView] = useInView()
  const viewWorkRef = useMagnetic(0.25)
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
        transform: shown
          ? 'translate3d(0, 0, 0)'
          : `translate3d(${slideX * 0.5}px, 14px, 0)`,
        transition: reduce
          ? 'none'
          : 'opacity 380ms cubic-bezier(0.22,1,0.36,1), transform 460ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'opacity, transform',
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
          <span className="text-accent">// about</span>
        </span>
      </div>

      {/* Identity band — name / now. The portrait lives in the 3D scene
          (buildAbout's centerpiece), not here. */}
      <div className="mb-5">
        <p className="font-display font-extrabold text-[25px] leading-none tracking-[-0.02em] m-0 mb-2.5 text-fg">
          {project.name}
        </p>
        <p className="font-mono text-[11px] text-dim2 flex items-center gap-2 m-0">
          <span
            className={`w-[7px] h-[7px] rounded-full bg-accent shrink-0 ${reduce ? '' : 'animate-pulse2'}`}
            style={{ boxShadow: '0 0 8px #57d36a' }}
          />
          <b className="text-cream-dim font-medium">now —</b> {project.now}
        </p>
      </div>

      {/* Headline — human voice; <em> renders accent green, upright */}
      <h2
        className="font-display font-extrabold text-[clamp(28px,3.4vw,40px)] leading-[1.0] tracking-[-0.02em] text-fg m-0 mb-4 text-balance [&_em]:not-italic [&_em]:text-accent"
        dangerouslySetInnerHTML={{ __html: project.headline }}
      />

      {/* Bio */}
      <p className="text-[14.5px] leading-[1.6] text-cream-dim m-0 mb-5">
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

      {/* GitHub contribution heatmap — live evidence under the stats */}
      <GitHubStats />

      {/* 4-stat grid — only the lead stat is accent green */}
      <div className="flex flex-wrap gap-2.5 mb-6 mt-5">
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
      {/* Actions — one row. The solid green pill is the only primary; the two
          secondaries are quieter filled-ink pills so they read as a pair. */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          ref={viewWorkRef}
          onClick={() => onViewWork?.()}
          className="inline-flex items-center gap-2 whitespace-nowrap font-mono font-bold text-[13px] leading-4 tracking-[0.02em] rounded-full px-5 py-2.5 bg-accent text-bg transition-shadow duration-200 hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)] border border-accent cursor-pointer after:content-['→']"
        >
          view work
        </button>
        <a
          href="mailto:brucebpeters12@gmail.com"
          className={SECONDARY_BTN}
        >
          get in touch
        </a>
        <a
          href="/resume.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className={SECONDARY_BTN}
        >
          résumé <span className="text-accent">↓</span>
        </a>
      </div>
    </div>
  )
}
