import { forwardRef, lazy, Suspense } from 'react'
import { PROJECTS } from '../data/projects.js'
import Hero from './Hero.jsx'
import ProjectCard from './ProjectCard.jsx'
import AboutCard from './AboutCard.jsx'

const WordWizDemo = lazy(() => import('./WordWizDemo.jsx'))

// "view work" on the About card jumps to the first real work node (the first
// project that isn't the overview or about narrative nodes).
const FIRST_WORK_INDEX = PROJECTS.findIndex(
  p => !p.isOverview && !p.isAbout && !p.isArchive && p.id !== 'archive'
)

// One full-height section per project node. The card sits in a side column
// (alternating left/right); narrative nodes (overview, archive intro) center.
const ProjectSection = forwardRef(function ProjectSection(
  { project, side, onExternalLink, goToIndex },
  ref
) {
  const isOverview = project.isOverview
  const isArchiveIntro = project.id === 'archive'
  const centered = isOverview || isArchiveIntro

  const minH = project.isArchive ? 'min-h-[78vh]' : 'min-h-screen'
  const justify = centered ? 'justify-center' : side === 'right' ? 'md:justify-end' : 'md:justify-start'

  return (
    <section
      ref={ref}
      className={`relative ${minH} flex items-center py-24`}
      style={{ pointerEvents: 'none' }}
    >
      <div className={`mx-auto w-full max-w-[1180px] px-6 md:px-12 flex justify-center ${justify}`}>
        {isOverview ? (
          <Hero />
        ) : isArchiveIntro ? (
          <NarrativeBlock project={project} />
        ) : project.isAbout ? (
          <div className="w-full max-w-[440px]" style={{ pointerEvents: 'auto' }}>
            <AboutCard
              project={project}
              side={side}
              onViewWork={() => goToIndex?.(FIRST_WORK_INDEX)}
            />
          </div>
        ) : (
          <div className="w-full max-w-[440px]" style={{ pointerEvents: 'auto' }}>
            <ProjectCard project={project} side={side} onExternalLink={onExternalLink} />
            {project.id === 'reader' && (
              <Suspense fallback={null}>
                <WordWizDemo />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </section>
  )
})

function NarrativeBlock({ project }) {
  return (
    <div className="text-center max-w-[640px] select-none">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-accent m-0 mb-4">
        // the archive
      </p>
      <h2 className="font-display font-extrabold text-[clamp(36px,6vw,72px)] m-0 mb-4 leading-[1.0] tracking-[-0.02em] text-fg">
        {project.title}
      </h2>
      <p className="text-[15px] leading-[1.6] text-cream-dim m-0 mx-auto max-w-[520px]">
        {project.desc}
      </p>
      {project.stats?.length > 0 && (
        <div className="flex gap-9 justify-center mt-8">
          {project.stats.map(([val, lbl]) => (
            <div key={lbl} className="flex flex-col items-center gap-1">
              <b className="font-display text-[30px] font-bold text-accent leading-none tracking-[-0.02em]">
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
  )
}

export default ProjectSection
