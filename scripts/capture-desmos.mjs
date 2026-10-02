// Captures a dark-mode screenshot of every graph in src/data/desmos.js into
// public/screenshots/desmos/<slug>.webp. View-only: it loads each graph by its
// public link, flips on reverse contrast, hides the Desmos UI chrome, lets the
// ticker run for a few seconds so sims are mid-motion, and screenshots the
// graph paper. Nothing is saved back to desmos.com.
//
//   node scripts/capture-desmos.mjs            # all graphs
//   node scripts/capture-desmos.mjs boids      # just these slugs
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { DESMOS_GRAPHS } from '../src/data/desmos.js'

const OUT_DIR = path.resolve('public/screenshots/desmos')
const WIDTH = 1200
const HEIGHT = 800
const HEADER = 46 // desmos.com top bar above the graph paper

// Per-graph framing. `zoom` > 1 zooms out around the saved viewport's center,
// `bounds` sets the viewport outright, `exprs` overrides expressions by id
// (only in this headless copy), and `runMs` is how long the ticker plays.
const TWEAKS = {
  'neural-net': { runMs: 8000 },
  boids: { zoom: 1.5 },
  kinematics: { zoom: 0.6 },
  'cube-game': { zoom: 0.75 },
  'text-renderer': { bounds: { left: -2, right: 44, bottom: -15.3, top: 15.3 } },
  // A game in progress reads better than an empty board.
  'tic-tac-toe': {
    bounds: { left: -4.5, right: 4.5, bottom: -3, top: 3 },
    exprs: { 1: 'b_{oard}=\\left[1,2,0,0,1,0,2,0,0\\right]' },
  },
}

const only = process.argv.slice(2)
const graphs = only.length ? DESMOS_GRAPHS.filter(g => only.includes(g.slug)) : DESMOS_GRAPHS
fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT + HEADER } })

for (const g of graphs) {
  const { zoom = 1, bounds = null, exprs = {}, runMs = 4000 } = TWEAKS[g.slug] ?? {}
  process.stdout.write(`${g.slug.padEnd(16)} `)
  try {
    await page.goto(g.href, { waitUntil: 'domcontentloaded' })
    // Wait for the saved state to actually land: calling setState on the empty
    // calculator that exists before it loads wipes the graph.
    await page.waitForFunction(
      () => window.Calc?.getState?.().expressions?.list?.length > 1,
      null,
      { timeout: 60000 }
    )
    await page.waitForTimeout(2500)
    await page.addStyleTag({
      content: '.dcg-graphpaper-branding,.dcg-overgraph-pillbox-elements{display:none!important}',
    })

    await page.evaluate(({ zoom, bounds, exprs }) => {
      const Calc = window.Calc
      const state = Calc.getState()
      if (state.expressions?.ticker) state.expressions.ticker.playing = true
      Calc.setState(state, { allowUndo: false })
      Calc.updateSettings({
        invertedColors: true,
        expressions: false,
        keypad: false,
        zoomButtons: false,
        settingsMenu: false,
        showResetButtonOnGraphpaper: false,
      })
      for (const [id, latex] of Object.entries(exprs)) Calc.setExpression({ id, latex })
      if (bounds) {
        Calc.setMathBounds(bounds)
      } else if (zoom !== 1 && Calc.graphpaperBounds?.mathCoordinates) {
        const b = Calc.graphpaperBounds.mathCoordinates
        const cx = (b.left + b.right) / 2, cy = (b.bottom + b.top) / 2
        const hw = (b.right - b.left) / 2 * zoom, hh = (b.top - b.bottom) / 2 * zoom
        Calc.setMathBounds({ left: cx - hw, right: cx + hw, bottom: cy - hh, top: cy + hh })
      }
    }, { zoom, bounds, exprs })
    await page.waitForTimeout(runMs)

    // Playwright only writes PNG/JPEG, so re-encode to WebP with the page's own
    // canvas encoder (no extra deps). Lines on black survive WebP far better
    // than JPEG at a fraction of the PNG size.
    const png = await page.screenshot({ clip: { x: 0, y: HEADER, width: WIDTH, height: HEIGHT } })
    const webpUrl = await page.evaluate(async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/webp', 0.86)
    }, `data:image/png;base64,${png.toString('base64')}`)
    const file = path.join(OUT_DIR, `${g.slug}.webp`)
    fs.writeFileSync(file, Buffer.from(webpUrl.split(',')[1], 'base64'))
    console.log(`ok  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`)
  } catch (e) {
    console.log(`FAIL ${e.message.split('\n')[0]}`)
  }
}

await browser.close()
