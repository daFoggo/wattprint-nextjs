// Screenshots of the local landing at desktop and phone, light and dark. usage: node shoot.mjs <playwright> <outDir> <url> [fullPage]
import { pathToFileURL } from "node:url"
import { mkdirSync } from "node:fs"

const [pwPath, out, url, full] = process.argv.slice(2)
const pw = await import(pathToFileURL(pwPath).href)
const chromium = pw.chromium ?? pw.default.chromium
mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
for (const theme of ["light", "dark"]) {
  for (const [name, width, height] of [["desktop", 1440, 900], ["phone", 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme)
    await page.goto(url, { waitUntil: "networkidle" })
    await page.waitForTimeout(1500)
    for (let i = 0; i < 40; i++) {
      const done = await page.evaluate(() => { window.scrollBy(0, 700); return innerHeight + scrollY >= document.documentElement.scrollHeight - 2 })
      await page.waitForTimeout(200)
      if (done) break
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(800)
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" })
    await page.screenshot({ path: `${out}/${name}-${theme}.png`, fullPage: full === "full" })
    await page.close()
  }
}
await browser.close()
console.log("done")
