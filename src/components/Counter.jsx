export default function Counter({ project }) {
  const label = project?.isOverview ? 'Drag · scroll · arrow keys' : (project?.label ?? '')

  return (
    <div className="fixed bottom-7 right-8 z-10 text-right pointer-events-none">
      <span className="font-serif text-[36px] text-fg leading-none block mb-1">
        {project?.index ?? '00'}
      </span>
      <span className="text-[10px] tracking-[0.16em] uppercase text-dim">
        {label}
      </span>
    </div>
  )
}
