// Sign in as the demo guest on the dev dashboard and print the Cookie header. usage: node cookie.mjs <playwright> <home label>
import { pathToFileURL } from "node:url"
const [pwPath, home] = process.argv.slice(2)
const pw = await import(pathToFileURL(pwPath).href)
const browser = await (pw.chromium ?? pw.default.chromium).launch()
const page = await browser.newPage()
await page.goto("http://localhost:11092/sign-in")
await page.getByRole("button", { name: "Xem nhà demo" }).click()
await page.getByText(home).first().click()
await page.waitForURL(/\/dashboard/, { timeout: 60_000 })
const cookies = await page.context().cookies("http://localhost:11092")
console.log(cookies.map((c) => `${c.name}=${c.value}`).join("; "))
await browser.close()
