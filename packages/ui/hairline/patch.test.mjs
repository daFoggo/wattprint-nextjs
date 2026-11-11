import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { apply, PATCHES } from "./patch.mjs"

const fake = (files) => ({
  read: (file) => files[file],
  write: (file, text) => (files[file] = text),
})

describe("hairline patches", () => {
  it("applies once, then skips, and reports upstream drift", () => {
    const [patch] = PATCHES
    const files = { [patch.file]: `a\n${patch.from}\nb` }
    const { read, write } = fake(files)
    expect(apply(read, write, [patch])).toEqual([])
    expect(files[patch.file]).toBe(`a\n${patch.to}\nb`)
    expect(apply(read, write, [patch])).toEqual([])
    files[patch.file] = "rewritten upstream"
    expect(apply(read, write, [patch])).toHaveLength(1)
  })

  it("is applied to the vendored files (run `pnpm hairline`, not a bare shadcn add)", () => {
    for (const patch of PATCHES) {
      const source = readFileSync(new URL(`../src/components/hairline/${patch.file}`, import.meta.url), "utf8")
      expect(source, patch.file).toContain(patch.to)
    }
  })
})
