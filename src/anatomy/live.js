// Shared plumbing for the live anatomy figures: one rAF loop that runs only
// while the figure is near the viewport, static art written once, and pointer
// to viewBox mapping.

export const prefersStill = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Write each static segment into its <g> once. Doing it here rather than
// through React keeps the nodes the loop queries the ones on the page.
export function fillStatics(groups, segments) {
  segments.forEach((segment, i) => {
    const g = groups[i]
    if (typeof segment === 'string' && g && g.dataset.filled !== '1') {
      g.innerHTML = segment
      g.dataset.filled = '1'
    }
  })
}

// step(dt) advances the model and returns true while anything still moves;
// draw() writes the DOM. Returns { run, stop } — call run() after input.
export function startLoop(root, { step, draw }) {
  let frame = 0
  let last = 0
  let visible = false
  const loop = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60
    last = now
    const going = step(dt)
    draw()
    frame = visible && going ? requestAnimationFrame(loop) : 0
  }
  const run = () => {
    if (!frame && visible) {
      last = 0
      frame = requestAnimationFrame(loop)
    }
  }
  const obs = new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting
      if (visible) run()
    },
    { rootMargin: '120px 0px' }
  )
  obs.observe(root)
  draw()
  return {
    run,
    stop: () => {
      obs.disconnect()
      cancelAnimationFrame(frame)
      frame = 0
    },
  }
}

export function toViewBox(svg, view, event) {
  const box = svg.getBoundingClientRect()
  return [((event.clientX - box.left) / box.width) * view.W, ((event.clientY - box.top) / box.height) * view.H]
}

export const setOn = (el, value) => {
  if (!el) return
  if (value) el.setAttribute('data-on', value === true ? '' : value)
  else el.removeAttribute('data-on')
}

export const writeText = (el, text) => {
  if (el && el.textContent !== text) el.textContent = text
}

// Exponential follow that lands exactly.
export const follow = (x, target, dt, tau, still) => {
  if (still) return target
  const next = x + (target - x) * (1 - Math.exp(-dt / tau))
  return Math.abs(target - next) < 1e-3 ? target : next
}
