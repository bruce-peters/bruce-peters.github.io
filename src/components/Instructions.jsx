export default function Instructions() {
  return (
    <div className="fixed bottom-7 left-8 z-10 pointer-events-none font-mono text-[10px] tracking-[0.16em] uppercase text-dim leading-[1.9]">
      <span className="text-accent">Scroll</span> to cycle works &nbsp;·&nbsp;{' '}
      <span className="text-accent">Drag</span> to orbit &nbsp;·&nbsp;{' '}
      <span className="text-accent">↑ ↓</span> arrow keys
    </div>
  )
}
