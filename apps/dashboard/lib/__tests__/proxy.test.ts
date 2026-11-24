import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ signedIn: false }))

vi.mock("@workspace/auth/proxy", () => ({
  updateSession: async (request: NextRequest) => ({
    response: NextResponse.next({ request }),
    isAuthenticated: auth.signedIn,
    role: null,
  }),
  redirectWithSession: (url: URL, session: NextResponse) => {
    const redirect = NextResponse.redirect(url)
    for (const cookie of session.cookies.getAll()) redirect.cookies.set(cookie)
    return redirect
  },
}))

const { proxy, config } = await import("../../proxy")

const run = (path: string) =>
  proxy(new NextRequest(new URL(path, "http://localhost:11092")))

describe("proxy", () => {
  beforeEach(() => {
    auth.signedIn = false
  })

  it.each([
    "/dashboard",
    "/%64ashboard",
    "/vi/dashboard",
  ])("sends a signed-out visitor from %s to sign-in", async (path) => {
    const res = await run(path)
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get("location")!).pathname).toMatch(/^(\/vi)?\/sign-in$/)
  })

  it("keeps the English prefix on its redirects", async () => {
    const out = await run("/en/dashboard")
    expect(new URL(out.headers.get("location")!).pathname).toBe("/en/sign-in")
    auth.signedIn = true
    const back = await run("/en/sign-in")
    expect(new URL(back.headers.get("location")!).pathname).toBe("/en/dashboard")
  })

  it("serves unprefixed paths in Vietnamese and leaves /auth handlers alone", async () => {
    auth.signedIn = true
    const vi = await run("/dashboard")
    expect(vi.headers.get("x-middleware-rewrite")).toMatch(/\/vi\/dashboard$/)
    const callback = await run("/auth/callback")
    expect(callback.headers.get("x-middleware-rewrite")).toBeNull()
  })

  it("refreshes the session for /api route handlers, without rewriting or redirecting them", async () => {
    // A chat open past the access token's 5 minutes posts to /api/copilot/chat: unrefreshed, the
    // handler redirected the POST to /auth/expired (405 → "Có lỗi khi trả lời").
    const [matcher] = config.matcher
    for (const path of ["/api/copilot/chat", "/api/copilot/voice/transcribe"])
      expect(new RegExp(`^${matcher}$`).test(path), path).toBe(true)
    for (const signedIn of [true, false]) {
      auth.signedIn = signedIn
      const res = await run("/api/copilot/chat")
      expect(res.headers.get("location")).toBeNull()
      expect(res.headers.get("x-middleware-rewrite")).toBeNull()
    }
  })

  it("does not treat a look-alike prefix as protected", async () => {
    const res = await run("/organization-info")
    expect(res.headers.get("location")).toBeNull()
  })

  it("sends a signed-in user away from the auth pages", async () => {
    auth.signedIn = true
    for (const path of ["/sign-in"]) {
      const res = await run(path)
      expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard")
    }
  })

  it("lets a signed-in user through and reports timing", async () => {
    auth.signedIn = true
    const res = await run("/dashboard")
    expect(res.headers.get("location")).toBeNull()
    expect(res.headers.get("server-timing")).toMatch(/^proxy;dur=/)
  })
})
