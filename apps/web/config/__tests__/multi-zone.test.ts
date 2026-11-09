import { describe, expect, it } from "vitest"

import nextConfig from "../../next.config"

const ORIGIN = "http://dashboard.internal:11092"

async function beforeFiles() {
  const rewrites = await nextConfig.rewrites!()
  if (Array.isArray(rewrites)) throw new Error("expected { beforeFiles }")
  return rewrites.beforeFiles!
}

/** The rule's destination for `path`, applying the rule the way Next's matcher does for these simple sources. */
function rewriteOf(
  rules: Awaited<ReturnType<typeof beforeFiles>>,
  path: string
) {
  for (const { source, destination } of rules) {
    const names = [...source.matchAll(/:(\w+)[*+]?/g)].map((m) => m[1])
    const pattern = source
      .replace(/\./g, "\\.")
      .replace(/:(\w+)\*/g, "(?<$1>.*)")
      .replace(/:(\w+)\+/g, "(?<$1>.+)")
    const match = new RegExp(`^${pattern}$`).exec(path)
    if (!match) continue
    return names.reduce<string>(
      (url, name) =>
        url
          .replace(`:${name}*`, match.groups?.[name!] ?? "")
          .replace(`:${name}+`, match.groups?.[name!] ?? ""),
      destination
    )
  }
  return null
}

describe("multi-zone rewrites (landing + dashboard on one domain)", () => {
  it.each([
    ["/sign-in", `${ORIGIN}/sign-in`],
    ["/dashboard", `${ORIGIN}/dashboard`],
    ["/auth/callback", `${ORIGIN}/auth/callback`],
    // segment prefetches (partialPrefetching) must reach the zone too
    ["/dashboard.segments/_tree", `${ORIGIN}/dashboard.segments/_tree`],
    ["/sign-in.segments/a/b", `${ORIGIN}/sign-in.segments/a/b`],
    // assets of the zone
    ["/dashboard-static/_next/x.js", `${ORIGIN}/dashboard-static/_next/x.js`],
  ])("sends %s to the dashboard", async (path, destination) => {
    expect(rewriteOf(await beforeFiles(), path)).toBe(destination)
  })

  it.each(["/", "/privacy", "/terms", "/projects", "/organization-info"])(
    "keeps %s on the landing",
    async (path) => {
      expect(rewriteOf(await beforeFiles(), path)).toBeNull()
    }
  )

  it("applies the landing CSP to landing paths only, never to the dashboard's own", async () => {
    const [rule] = await nextConfig.headers!()
    const source = rule!.source
    // The source is a path-to-regexp pattern, and this one is plain regex syntax too.
    const csp = new RegExp(`^${source}$`)
    for (const path of [
      "/",
      "/privacy",
      "/projects",
      "/organization-info",
      "/authors",
    ]) {
      expect(csp.test(path), path).toBe(true)
    }
    for (const path of [
      "/dashboard",
      "/sign-in",
      "/sign-in.segments/a",
      "/auth/callback",
      "/dashboard-static/x.js",
    ]) {
      expect(csp.test(path), path).toBe(false)
    }
  })
})
