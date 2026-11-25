import { describe, expect, it } from "vitest"

import { jsonLd, sectionHref } from "../seo"

describe("sectionHref", () => {
  it("keeps the home path, so a section link works from any page", () => {
    expect(sectionHref("/", "how")).toBe("/#how")
    expect(sectionHref("/en", "faq")).toBe("/en#faq")
  })
})

describe("jsonLd", () => {
  it("never lets a string close the script tag", () => {
    const out = jsonLd({ text: "a </script><img src=x> b" })
    expect(out).not.toContain("<")
    expect(JSON.parse(out)).toEqual({ text: "a </script><img src=x> b" })
  })
})
