// node scripts/shot.mjs out.png <stage> [click text...]
// Headless 2x capture of the running dev server (port 5450).
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const [out = 'shots/shot.png', stage = 'car', ...clicks] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1512, height: 945 }, deviceScaleFactor: 2 })
await page.goto(`http://localhost:5450/?s=${stage}`)
await page.waitForSelector('.stage')
for (const text of clicks) {
  await page.getByText(text, { exact: false }).first().click()
  await page.waitForTimeout(250)
}
await page.waitForTimeout(700)
await page.screenshot({ path: out })
await browser.close()
console.log('wrote', out)
