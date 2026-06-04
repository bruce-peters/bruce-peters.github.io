export default function IdentityBlock() {
  return (
    <div className="fixed top-7 left-8 z-20 max-w-xs pointer-events-none">
      {/* The mark — Bruce's initials as a phoneme token: /bp/ */}
      <span
        className="inline-flex items-center font-mono font-extrabold leading-none rounded-full bg-accent text-bg mb-3"
        style={{
          fontSize: '26px',
          letterSpacing: '-0.01em',
          padding: '0.42em 0.6em 0.5em',
          boxShadow: '0 0 0 1px rgba(87,211,106,0.4), 0 8px 32px rgba(87,211,106,0.35)',
        }}
      >
        <span style={{ fontWeight: 500, opacity: 0.55 }}>/</span>bp
        <span style={{ fontWeight: 500, opacity: 0.55 }}>/</span>
      </span>
    </div>
  )
}
