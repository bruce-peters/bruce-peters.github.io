export default function Hero({ isOverview }) {
  return (
    <div
      className="fixed left-1/2 z-10 text-center pointer-events-none select-none transition-all duration-700"
      style={{
        top: '50%',
        transform: `translate(-50%, calc(-50% + ${isOverview ? '200px' : '240px'}))`,
        opacity: isOverview ? 1 : 0,
      }}
    >
      <p className="text-[10px] tracking-[0.3em] uppercase text-dim m-0 mb-3.5">
        Builder · Founder · Class of 2027
      </p>
      <h1 className="font-serif text-[clamp(40px,6vw,84px)] font-normal m-0 leading-none tracking-[-0.01em] text-fg">
        Hi, I'm
        <br />
        <em style={{ fontStyle: 'italic', color: '#e7c265' }}>
          Bruce.
        </em>
      </h1>
      <p className="mt-[18px] mb-0 text-[10px] tracking-[0.24em] uppercase text-dim">
        Hillsborough, CA · Burlingame HS · scroll to explore
      </p>
    </div>
  )
}
