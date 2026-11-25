// Screenshots of the running dashboard on a demo home, for the landing page (plan Task 2).
// usage: node capture-demo.mjs <playwright index.js> <outDir> <homeLabel> <route,route,...> [--light]
import { pathToFileURL } from "node:url"
import { mkdirSync } from "node:fs"

const [pwPath, out, home, routesArg, mode] = process.argv.slice(2)
const pw = await import(pathToFileURL(pwPath).href)
const chromium = pw.chromium ?? pw.default.chromium
mkdirSync(out, { recursive: true })
const base = "http://localhost:11092"
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1920, height: 1200 },
  deviceScaleFactor: 1.5,
  colorScheme: mode === "--light" ? "light" : "dark",
  locale: "vi-VN",
})
// next-themes defaults to dark and ignores the OS scheme until a choice is stored
await page.addInitScript((t) => localStorage.setItem("theme", t), mode === "--light" ? "light" : "dark")
await page.goto(`${base}/sign-in`)
await page.getByRole("button", { name: "Xem nhà demo" }).click()
await page.getByText(home).first().click()
await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
for (const route of routesArg.split(",")) {
  await page.goto(`${base}${route}`)
  await page.waitForLoadState("networkidle")
  if (route.endsWith("/copilot") && process.env.QUESTION) {
    await page.getByPlaceholder("Hỏi về điện nhà bạn…").fill(process.env.QUESTION)
    await page.keyboard.press("Enter")
    await page.getByText("Gợi ý tiếp", { exact: false }).first().waitFor({ timeout: 90_000 }).catch(() => {})
  }
  if (route.endsWith("/plan")) await page.getByRole("checkbox").first().check().catch(() => {})
  await page.waitForTimeout(4000) // number rolls and chart entrances settle
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }) // the dev-only indicator
  const name = route.split("/").filter(Boolean).pop()
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log("saved", name)
}
await browser.close()
