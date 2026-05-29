export default function LoadingScreen({ loaded }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-700"
      style={{ opacity: loaded ? 0 : 1, pointerEvents: loaded ? 'none' : 'auto' }}
    >
      <span className="text-[10px] tracking-[0.3em] uppercase text-dim">
        Loading scene…
      </span>
    </div>
  )
}
