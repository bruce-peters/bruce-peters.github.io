// Flat, recruiter-friendly view of the portfolio. Driven entirely by the same
// PROJECTS data as the 3D site — no content duplication. Three.js is never
// initialized when this view is active (fast, printable, accessible).
// Reachable via ?mode=resume URL param or the "text view" chrome link.
// Print stylesheet included via @media print so ⌘P yields a clean page.
import { PROJECTS, ARCHIVE_WORKS } from '../data/projects.js'

const mainProjects = PROJECTS.filter(p => !p.isOverview && !p.isAbout && !p.isArchive)
const aboutNode = PROJECTS.find(p => p.isAbout)

function Tag({ children }) {
  return (
    <span className="inline-block font-mono text-[10px] tracking-[0.1em] uppercase text-dim2 border border-line rounded-full px-2 py-0.5">
      {children}
    </span>
  )
}

export default function ResumeView({ onExit }) {
  return (
    <div className="min-h-screen bg-bg text-fg" style={{ fontFamily: 'inherit' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          a { color: black; }
        }
      `}</style>

      {/* Header */}
      <header className="max-w-[760px] mx-auto px-8 pt-16 pb-10 border-b border-line">
        <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
          <div>
            <h1 className="font-display font-extrabold text-[36px] leading-none tracking-[-0.02em] text-fg m-0 mb-2">
              {aboutNode?.name ?? 'Bruce Peters'}
            </h1>
            <p className="font-mono text-[12px] text-dim tracking-[0.1em] uppercase m-0">
              {aboutNode?.role?.replace('\n', ' · ')}
            </p>
          </div>
          <div className="font-mono text-[11px] text-dim2 space-y-1 text-right no-print">
            <div>
              <a href="mailto:brucebpeters12@gmail.com" className="text-accent hover:underline no-underline">
                brucebpeters12@gmail.com
              </a>
            </div>
            <div>
              <a href="https://github.com/bruce-peters" target="_blank" rel="noopener noreferrer" className="text-dim hover:text-accent no-underline">
                github.com/bruce-peters
              </a>
            </div>
            <div>
              <a href="/resume.pdf" target="_blank" rel="noopener noreferrer" className="text-dim hover:text-accent no-underline">
                resume.pdf ↓
              </a>
            </div>
          </div>
        </div>

        {aboutNode?.desc && (
          <p className="text-[14px] leading-[1.65] text-cream-dim m-0 mb-5 max-w-[580px]">
            {aboutNode.desc}
          </p>
        )}

        {/* Stats */}
        {aboutNode?.stats?.length > 0 && (
          <div className="flex gap-6 flex-wrap">
            {aboutNode.stats.map(([v, l]) => (
              <div key={l}>
                <span className="font-display font-extrabold text-[22px] text-accent leading-none">{v}</span>
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-dim2 ml-1.5">{l}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Main projects */}
      <main className="max-w-[760px] mx-auto px-8 py-10">
        <h2 className="font-mono text-[11px] tracking-[0.2em] uppercase text-dim mb-6">
          <span className="text-accent">// selected work</span>
        </h2>

        <div className="space-y-8">
          {mainProjects.map(p => (
            <article key={p.id} className="border border-line rounded-[14px] p-6">
              <div className="flex items-baseline justify-between gap-4 mb-2 flex-wrap">
                <h3 className="font-display font-bold text-[20px] leading-tight tracking-[-0.02em] text-fg m-0">
                  {p.title}
                </h3>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-dim2 whitespace-nowrap">
                  {p.year}
                </span>
              </div>

              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-dim mb-3">
                {p.label}
              </p>

              <p className="text-[13px] leading-[1.65] text-cream-dim m-0 mb-4">
                {p.desc}
              </p>

              {/* Tags + stats inline */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {p.tags?.map(t => <Tag key={t}>{t}</Tag>)}
              </div>

              {p.stats?.length > 0 && (
                <div className="flex gap-4 flex-wrap mb-4">
                  {p.stats.map(([v, l], i) => (
                    <div key={l} className="flex items-baseline gap-1.5">
                      <span className={`font-display font-extrabold text-[18px] leading-none ${i === 0 ? 'text-accent' : 'text-fg'}`}>{v}</span>
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-dim2">{l}</span>
                    </div>
                  ))}
                </div>
              )}

              {(p.cta || p.repo) && (
                <div className="flex gap-3">
                  {p.cta && (
                    <a
                      href={p.cta.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] tracking-[0.1em] text-accent no-underline hover:underline"
                    >
                      {p.cta.label} →
                    </a>
                  )}
                  {p.repo && (
                    <a
                      href={p.repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] tracking-[0.1em] text-dim no-underline hover:text-accent"
                    >
                      github →
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Archive */}
        <details className="mt-10">
          <summary className="font-mono text-[11px] tracking-[0.2em] uppercase text-dim cursor-pointer mb-4 hover:text-accent transition-colors">
            <span className="text-accent">// archive</span> · {ARCHIVE_WORKS.length} earlier projects
          </summary>
          <div className="mt-4 space-y-2">
            {ARCHIVE_WORKS.map((w, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4 py-2 border-b border-line last:border-0">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="font-display font-semibold text-[14px] text-fg whitespace-nowrap">{w.title}</span>
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-dim2 truncate hidden sm:block">{w.tag}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[10px] text-dim2">{w.year}</span>
                  {w.href && (
                    <a href={w.href} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-dim hover:text-accent no-underline">↗</a>
                  )}
                  {w.repo && (
                    <a href={w.repo} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-dim hover:text-accent no-underline">gh</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>

        {/* Footer / back to 3D */}
        <div className="mt-14 pt-8 border-t border-line flex justify-between items-center flex-wrap gap-4 no-print">
          <button
            onClick={onExit}
            className="font-mono text-[11px] tracking-[0.15em] uppercase text-dim hover:text-accent transition-colors bg-transparent border-0 cursor-pointer p-0"
          >
            ← back to 3d view
          </button>
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-mono font-bold text-[13px] tracking-[0.02em] rounded-full px-[22px] py-2.5 bg-accent text-bg no-underline hover:shadow-[0_0_0_1px_rgba(87,211,106,0.4),0_8px_32px_rgba(87,211,106,0.35)] transition-all duration-200"
          >
            download résumé PDF
          </a>
        </div>
      </main>
    </div>
  )
}
