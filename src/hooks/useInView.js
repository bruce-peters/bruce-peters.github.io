import { useEffect, useRef, useState } from 'react'

// Fires once when `ref`'s element first scrolls into view. Used to trigger
// the card's decrypt-in animation as it enters the viewport.
export default function useInView({ threshold = 0.35, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView, threshold, rootMargin])

  return [ref, inView]
}
