// Layout shifts on load and while scrolling. usage: node cls.mjs <playwright> <url>
import { pathToFileURL } from "node:url"
const [pwPath, url] = process.argv.slice(2)
const pw = await import(pathToFileURL(pwPath).href)
const browser = await (pw.chromium ?? pw.default.chromium).launch()
for (const [name, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.addInitScript(() => {
    window.__shifts = []
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue
        window.__shifts.push({ v: +e.value.toFixed(4), y: Math.round(scrollY), src: (e.sources || []).map((s) => { const n = s.node; return n ? (n.className?.toString?.() || n.nodeName).slice(0, 60) : "?" }) })
      }
    }).observe({ type: "layout-shift", buffered: true })
  })
  await page.goto(url, { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)
  for (let i = 0; i < 30; i++) {
    const done = await page.evaluate(() => { scrollBy(0, 600); return innerHeight + scrollY >= document.documentElement.scrollHeight - 2 })
    await page.waitForTimeout(300)
    if (done) break
  }
  await page.waitForTimeout(1500)
  const shifts = await page.evaluate(() => window.__shifts)
  const total = shifts.reduce((a, s) => a + s.v, 0)
  console.log(`${url} ${name}: CLS ${total.toFixed(3)}`)
  for (const s of shifts.filter((s) => s.v > 0.001)) console.log("  ", s.v, "at y", s.y, JSON.stringify(s.src))
  await page.close()
}
await browser.close()
