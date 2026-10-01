import { chromium } from 'playwright'
import fs from 'node:fs'
const OUT = process.argv[2]
const WANT = (process.argv[3] || '1,2,3,5').split(',').map(Number)
const PFX = process.argv[4] || 'g'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type()==='error') errs.push('CONSOLE: '+m.text()) })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => getComputedStyle(document.body).overflow !== 'hidden' && document.body.scrollHeight > 4000, { timeout: 60000 })
await page.waitForTimeout(2500)
const secs = await page.evaluate(() => [...document.querySelectorAll('section')].map(s => {
  const r = s.getBoundingClientRect(); return { top: Math.round(r.top+window.scrollY), h: Math.round(r.height) }
}))
const client = await page.context().newCDPSession(page)
const wheelTo = async (target) => {
  for (let guard=0; guard<400; guard++) {
    const cur = await page.evaluate(() => window.scrollY)
    const d = target - cur
    if (Math.abs(d) < 30) break
    await page.mouse.wheel(0, Math.sign(d) * Math.min(400, Math.abs(d)))
    await page.waitForTimeout(45)
  }
  await page.waitForTimeout(1400)
}
for (const i of WANT) {
  if (!secs[i]) continue
  await wheelTo(Math.max(0, secs[i].top + secs[i].h/2 - 450))
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${OUT}/${PFX}-${String(i).padStart(2,'0')}.png`, Buffer.from(data, 'base64'))
  const m = await page.evaluate((idx) => {
    const c = document.querySelectorAll('section')[idx].querySelector('div.shadow-2xl')
    if (!c) return null; const r = c.getBoundingClientRect()
    return { op: getComputedStyle(c).opacity, top: Math.round(r.top), bot: Math.round(r.bottom), h: Math.round(r.height) }
  }, i)
  console.log('sec', i, JSON.stringify(m))
}
console.log('errors:', errs.length ? errs.slice(0,5).join('\n') : 'none')
await browser.close()
