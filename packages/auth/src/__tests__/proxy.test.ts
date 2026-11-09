import { NextResponse } from "next/server"
import { describe, expect, it } from "vitest"

import { redirectWithSession } from "../proxy"

describe("redirectWithSession", () => {
  it("keeps the refreshed cookies and cache headers", () => {
    const session = NextResponse.next()
    session.cookies.set("nmb-web-auth", "v")
    session.headers.set("cache-control", "private, no-store")
    const redirect = redirectWithSession(
      new URL("http://localhost:11091/sign-in"),
      session
    )
    expect(redirect.cookies.get("nmb-web-auth")?.value).toBe("v")
    expect(redirect.headers.get("cache-control")).toBe("private, no-store")
    expect(redirect.headers.get("location")).toBe(
      "http://localhost:11091/sign-in"
    )
  })
})
