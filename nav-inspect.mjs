import { chromium } from './node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto('http://localhost:5179', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const data = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('nav a, nav button')).map(el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName, text: el.textContent.trim(),
      fontSize: s.fontSize, lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing, fontWeight: s.fontWeight,
      paddingTop: s.paddingTop, paddingBottom: s.paddingBottom,
      height: r.height.toFixed(2), top: r.top.toFixed(2),
    };
  });
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
