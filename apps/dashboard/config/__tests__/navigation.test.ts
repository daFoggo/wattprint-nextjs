import { describe, expect, it } from "vitest"

import {
  breadcrumbTrail,
  filterNav,
  fillHref,
  NAV_SCOPES,
  resolveScope,
  sectionsFor,
  type NavScope,
} from "../navigation"

/** A scoped menu like the one docs/routing-and-layouts.md §6.4 adds: it owns `/customer/<id>/…`. */
const SCOPES: NavScope[] = [
  ...NAV_SCOPES,
  {
    id: "customer",
    prefix: "/customer",
    param: "customerId",
    sections: [
      {
        label: "Customer",
        entries: [
          {
            title: "Invoices",
            href: "/customer/:customerId/invoices",
            icon: "overview",
            permission: "account:view",
          },
        ],
      },
    ],
  },
]

describe("resolveScope", () => {
  it("picks the scope by URL prefix and reads its param", () => {
    expect(resolveScope(SCOPES, "/customer/42/invoices")).toMatchObject({
      scope: { id: "customer" },
      params: { customerId: "42" },
    })
  })

  it("falls back to the global scope", () => {
    expect(resolveScope(SCOPES, "/dashboard")?.scope.id).toBe("global")
    expect(resolveScope(SCOPES, "/customer")?.scope.id).toBe("global")
  })
})

describe("sectionsFor / fillHref", () => {
  it("fills :params in hrefs and encodes the values", () => {
    expect(fillHref("/customer/:customerId/x", { customerId: "a b" })).toBe(
      "/customer/a%20b/x"
    )
    const hrefs = sectionsFor(SCOPES, "/customer/42")
      .flatMap((s) => s.entries)
      .map((e) => ("href" in e ? e.href : ""))
    expect(hrefs).toContain("/customer/42/invoices")
    expect(hrefs.join()).not.toContain(":")
  })
})

describe("filterNav", () => {
  it("drops links the role cannot open, keeping the scope list intact", () => {
    const none = filterNav(SCOPES, () => false)
    expect(none).toHaveLength(SCOPES.length)
    expect(none.every((scope) => scope.sections.length === 0)).toBe(true)
  })
})

describe("breadcrumbTrail", () => {
  it("reads like a path on global pages", () => {
    const crumbs = breadcrumbTrail("/dashboard", SCOPES)
    expect(crumbs.map((c) => c.label)).toEqual(["dashboard", "overview"])
  })

  it("names the last crumb after the nav link in a scope", () => {
    const crumbs = breadcrumbTrail("/customer/42/invoices", SCOPES)
    expect(crumbs.map((c) => c.label)).toEqual(["customer", "42", "invoices"])
  })
})
