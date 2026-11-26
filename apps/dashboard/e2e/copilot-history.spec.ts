import { expect, test, type Page } from "@playwright/test"

// Signs in as a demo guest (the stamp is base36: a long number reads as a card number to the privacy check) and asks one question (one paid answer per case), so the history holds a real chat.
async function chatAsGuest(page: Page, question: string) {
  await page.goto("/sign-in")
  await page.getByRole("button", { name: "Xem nhà demo" }).click()
  await page.getByText("REFIT House 2").first().click()
  await page.waitForURL("**/dashboard")
  await page.goto("/dashboard/copilot")
  await page.getByRole("textbox", { name: "Hỏi về điện nhà bạn…" }).fill(question)
  // The backend stores the question before it answers: from then on the history lists it.
  const asked = page.waitForResponse("**/api/copilot/chat")
  await page.keyboard.press("Enter")
  await asked
  await page.goto("/dashboard/copilot")
  return history(page).getByRole("listitem").filter({ hasText: question })
}

const history = (page: Page) => page.getByRole("complementary", { name: "Lịch sử trò chuyện" })

async function remove(page: Page, question: string) {
  await history(page).getByRole("listitem").filter({ hasText: question }).hover()
  await page.getByRole("button", { name: `Xóa ${question}` }).click()
}

// networkidle: the history lists nothing until its list request answers, so an absent row means nothing before that.
test.describe("Copilot history", () => {
  // A delete waits out its undo window; leaving within it used to drop the delete and bring the chat back.
  test("a chat deleted just before leaving the page stays deleted", async ({
    page,
  }) => {
    const question = `Chào Wappi ${Date.now().toString(36)}`
    const row = await chatAsGuest(page, question)
    await expect(row).toBeVisible()
    // Undo inside the window keeps the chat, past the window and a reload.
    await remove(page, question)
    await row.getByRole("button", { name: "Hoàn tác" }).click()
    await page.waitForTimeout(6000) // the undo window is 5 s
    await page.reload({ waitUntil: "networkidle" })
    await expect(row).toBeVisible()
    await remove(page, question)
    // In-app navigation: the history unmounts while the page stays.
    await page.getByRole("link", { name: "Tổng quan" }).click()
    await page.waitForURL("**/dashboard")
    await page.goto("/dashboard/copilot", { waitUntil: "networkidle" })
    await expect(history(page).getByText(question)).toHaveCount(0)
  })

  test("a chat deleted just before a reload stays deleted", async ({
    page,
  }) => {
    const question = `Xin chào Wappi ${Date.now().toString(36)}`
    await expect(await chatAsGuest(page, question)).toBeVisible()
    await remove(page, question)
    // The keepalive DELETE may land just after the reloaded page reads its list: the next read must not have it.
    await expect(async () => {
      await page.reload({ waitUntil: "networkidle" })
      await expect(history(page).getByText(question)).toHaveCount(0)
    }).toPass({ timeout: 15_000 })
  })
})
