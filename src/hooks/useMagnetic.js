import { useRef, useEffect } from 'react'

// Subtle cursor-attraction effect for pill buttons. Element drifts a few px
// toward the cursor on hover, springs back on leave.
// Skipped when prefers-reduced-motion or touch device.
export default function useMagnetic(strength = 0.28) {
  const ref = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia?.('(hover: hover)').matches) return

    const el = ref.current
    if (!el) return

    let rafId = null
    let tx = 0, ty = 0
    let inside = false

    const apply = () => {
      rafId = null
      el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`
    }

    const onMove = (e) => {
      if (!inside) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      tx = (e.clientX - cx) * strength
      ty = (e.clientY - cy) * strength
      if (!rafId) rafId = requestAnimationFrame(apply)
    }

    const onEnter = () => {
      inside = true
      el.style.transition = 'transform 0.12s ease-out'
    }

    const onLeave = () => {
      inside = false
      tx = 0; ty = 0
      el.style.transition = 'transform 0.55s cubic-bezier(0.23,1,0.32,1)'
      if (!rafId) rafId = requestAnimationFrame(apply)
    }

    window.addEventListener('mousemove', onMove)
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      if (rafId) cancelAnimationFrame(rafId)
      el.style.transform = ''
      el.style.transition = ''
    }
  }, [strength])

  return ref
}
