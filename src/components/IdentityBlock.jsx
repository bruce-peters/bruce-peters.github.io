export default function IdentityBlock() {
  return (
    <div className="fixed top-7 left-8 z-10 max-w-xs pointer-events-none">
      <p className="font-serif text-[26px] font-normal tracking-[0.01em] leading-none mb-2.5 text-fg m-0">
        Bruce Peters
      </p>
      <p className="text-[11px] uppercase tracking-[0.18em] text-dim m-0 flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse2"
          style={{ boxShadow: '0 0 8px #4ade80' }}
        />
        Builder · FRC Programmer · Founder
      </p>
    </div>
  )
}
