export default function ProjectCard({ project, onExternalLink }) {
  const visible = project && !project.isOverview

  return (
    <div
      className="fixed left-1/2 z-20 transition-all duration-[400ms]"
      style={{
        bottom: '80px',
        width: 'min(560px, calc(100vw - 64px))',
        transform: `translateX(-50%) translateY(${visible ? '0' : '20px'})`,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="rounded-lg border px-6 py-5"
        style={{
          background: 'rgba(10,10,10,0.72)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        {project && !project.isOverview && (
          <>
            {/* Top row */}
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[10px] tracking-[0.2em] uppercase text-dim">
                Work {project.index} · {project.label}
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase text-dim">
                {project.year}
              </span>
            </div>

            {/* Title */}
            <h2 className="font-serif text-3xl font-normal m-0 mb-2 leading-[1.1] text-fg">
              {project.title}
            </h2>

            {/* Description */}
            <p className="text-[13px] leading-[1.55] text-[#cbc7bf] m-0 mb-4">
              {project.desc}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-3.5">
              {project.tags.map(t => (
                <span
                  key={t}
                  className="text-[10px] tracking-[0.12em] uppercase text-dim border rounded-full px-2.5 py-1"
                  style={{ borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-end gap-4">
              {project.cta ? (
                <button
                  onClick={() => onExternalLink?.(project.cta.href)}
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-fg no-underline border-b border-fg pb-0.5 hover:text-accent hover:border-accent transition-colors duration-200 after:content-['→'] bg-transparent border-x-0 border-t-0 cursor-pointer font-[inherit] p-0"
                >
                  {project.cta.label}
                </button>
              ) : (
                <span />
              )}

              {project.stats && project.stats.length > 0 && (
                <div className="flex gap-[18px]">
                  {project.stats.map(([val, lbl]) => (
                    <div key={lbl} className="flex flex-col items-end gap-0.5">
                      <b className="font-serif text-[22px] font-normal text-fg leading-none tracking-normal normal-case">
                        {val}
                      </b>
                      <span className="text-[10px] tracking-[0.16em] uppercase text-dim">
                        {lbl}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
