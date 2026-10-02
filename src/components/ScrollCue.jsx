import { ChevronDown } from 'lucide-react'

// "There's more below" hint at the foot of the first screen: a green-ringed pill
// with a chevron that nudges down. Solid fill so it reads over the busy field. It
// fades in a couple of seconds after the loader clears, so people who scroll
// right away never see it, and it scrolls off with the hero. Reduced motion
// keeps the chevron still.
export default function ScrollCue({ visible, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll to the next section"
      className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-ink-800 border border-solid border-accent/50 text-accent cursor-pointer p-0 transition-colors duration-[140ms] hover:border-accent active:scale-[0.96] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent ${visible ? 'animate-cue-in' : 'opacity-0'}`}
      style={{ pointerEvents: 'auto' }}
    >
      <ChevronDown size={22} strokeWidth={2.25} className="motion-safe:animate-cue-nudge" aria-hidden="true" />
    </button>
  )
}
