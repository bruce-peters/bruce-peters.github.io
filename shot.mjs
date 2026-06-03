import { chromium } from 'playwright'
import fs from 'node:fs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
const errs = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)

const findCard = () => {
  const nameEl = [...document.querySelectorAll('*')].find(
    e => e.childNodes.length === 1 && e.textContent === 'Bruce Peters'
  )
  let el = nameEl
  while (el && !(el.className && String(el.className).includes('shadow-2xl') && String(el.className).includes('border-line'))) el = el.parentElement
  return el
}

// Center the card via window.scrollTo using its absolute page position.
await page.evaluate((fn) => {
  const findCard = new Function('return (' + fn + ')')()
  const el = findCard()
  const r = el.getBoundingClientRect()
  const absTop = r.top + window.scrollY
  window.scrollTo(0, Math.max(0, absTop - (window.innerHeight - r.height) / 2))
}, findCard.toString())

// Poll until the glass-settle entrance completes (opacity → 1).
let rect = null
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(400)
  rect = await page.evaluate((fn) => {
    const findCard = new Function('return (' + fn + ')')()
    const el = findCard()
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { x: r.x, y: r.y, w: r.width, h: r.height, opacity: cs.opacity }
  }, findCard.toString())
  if (rect && parseFloat(rect.opacity) > 0.98) break
}
console.log('card:', JSON.stringify(rect))
await page.waitForTimeout(800) // settle camera + bob

const client = await page.context().newCDPSession(page)
if (rect && rect.w > 0) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 2 },
  })
  fs.writeFileSync('about-card.png', Buffer.from(data, 'base64'))
}
const full = await client.send('Page.captureScreenshot', { format: 'png' })
fs.writeFileSync('about-verify.png', Buffer.from(full.data, 'base64'))

console.log('errors:', errs.length ? errs.join('\n') : 'none')
await browser.close()
