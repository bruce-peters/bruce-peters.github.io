import { lazy } from 'react'

// Anatomy figures, keyed by the `anatomy` field on a PROJECTS entry. Each one
// is its own chunk, loaded when its plate first nears the viewport.
export const FIGURES = {
  superstructure: {
    Figure: lazy(() => import('./superstructure/Figure.jsx')),
    fig: '// fig 06',
    title: 'superstructure interlock',
    hint: 'pull a lever',
    rest: 'stow · 0.6 in · -96°',
    ratio: 300 / 600,
  },
  shooter: {
    Figure: lazy(() => import('./shooter/Figure.jsx')),
    fig: '// fig 01',
    title: 'shoot on the move',
    hint: 'hover to drive',
    rest: '2.7 m · 0.0 m/s · lead 0° · hood 74°',
    ratio: 300 / 600,
  },
  offtask: {
    Figure: lazy(() => import('./offtask/Figure.jsx')),
    fig: '// fig 03',
    title: 'short line, long line',
    hint: 'click to change lesson',
    rest: 'all windows · .671 vs .657',
    ratio: 300 / 600,
  },
  robotsim: {
    Figure: lazy(() => import('./robotsim/Figure.jsx')),
    fig: '// fig 04',
    title: 'same code, any body',
    hint: 'click to switch mode',
    rest: 'sim · setup_l4 · 31.6 in · 144° · 0.0 m/s',
    ratio: 300 / 600,
  },
  soundsorter: {
    Figure: lazy(() => import('./soundsorter/Figure.jsx')),
    fig: '// fig 02',
    title: 'sound sorter',
    hint: 'tap for the next reading',
    rest: '1 of 4 · “The dog ran.”',
    ratio: 424 / 760,
  },
}
