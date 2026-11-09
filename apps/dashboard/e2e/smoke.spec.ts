import { expect, test, type Page } from "@playwright/test"

/** Collects console errors, page errors and failed font requests for one page. */
function watch(page: Page) {
  const errors: string[] = []
  const fonts: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[${page.url()}] ${msg.text()}`)
  })
  page.on("pageerror", (err) => errors.push(`[${page.url()}] ${err.message}`))
  page.on("requestfailed", (req) => {
    if (req.url().includes(".woff2")) fonts.push(req.url())
  })
  return { errors, fonts }
}

test.describe("Smoke", () => {
  test("home sends a signed-out visitor to sign-in", async ({ page }) => {
    const { errors, fonts } = watch(page)
    await page.goto("/")
    await page.waitForURL("**/sign-in**")
    await expect(page.locator("html")).toHaveAttribute("lang", "en")
    expect(fonts).toEqual([])
    expect(errors).toEqual([])
  })

  test("sign-in shows only the Google button", async ({ page }) => {
    const { errors } = watch(page)
    const response = await page.goto("/sign-in")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Sign in/)
    await expect(
      page.getByRole("button", { name: "Continue with Google" })
    ).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test("account redirects to sign-in without a session", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("**/sign-in**")
    expect(new URL(page.url()).pathname).toBe("/sign-in")
  })
})
