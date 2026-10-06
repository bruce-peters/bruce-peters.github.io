// In-flow hero for the overview section. Centered; the 3D field sits behind it.
export default function Hero() {
  return (
    <div className="text-center select-none">
      <p className="font-mono text-[11px] tracking-[0.18em] text-accent m-0 mb-5">
        // builder · leader · class of 2027
      </p>
      <h1 className="font-display font-extrabold text-[clamp(52px,10vw,128px)] m-0 leading-[0.92] tracking-[-0.03em] text-fg">
        hi, i'm
        <br />
        <span className="text-accent">bruce.</span>
      </h1>
    </div>
  )
}
