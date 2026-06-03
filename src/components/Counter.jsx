export default function Counter({ project }) {
  const label = project?.isOverview ? 'Drag · scroll · arrow keys' : (project?.label ?? '')

  return (
    <div className="fixed bottom-7 right-8 z-10 text-right pointer-events-none">
      <span className="font-display font-bold text-[36px] text-accent leading-none block mb-1 tracking-[-0.02em]">
        {project?.index ?? '00'}
      </span>
      <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-dim">
        {label}
      </span>
    </div>
  )
}
