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
    // Vietnamese is the default locale (i18n/routing.ts).
    await expect(page.locator("html")).toHaveAttribute("lang", "vi")
    expect(fonts).toEqual([])
    expect(errors).toEqual([])
  })

  test("sign-in offers Google and email, with no password field of its own", async ({
    page,
  }) => {
    const { errors } = watch(page)
    const response = await page.goto("/sign-in")
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(/Đăng nhập/)
    await expect(
      page.getByRole("button", { name: "Tiếp tục với Google" })
    ).toBeVisible()
    // Email sign-in happens on the Keycloak page, so the password stays off this one.
    await expect(
      page.getByRole("button", { name: "Đăng nhập bằng email" })
    ).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test("account redirects to sign-in without a session", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("**/sign-in**")
    expect(new URL(page.url()).pathname).toBe("/sign-in")
  })

  for (const path of [
    "/dashboard/statistics",
    "/dashboard/devices",
    "/dashboard/devices/fridge",
    "/dashboard/bill",
    "/dashboard/settings",
  ]) {
    test(`${path} redirects to sign-in without a session`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL("**/sign-in**")
      expect(new URL(page.url()).pathname).toBe("/sign-in")
    })
  }
})
