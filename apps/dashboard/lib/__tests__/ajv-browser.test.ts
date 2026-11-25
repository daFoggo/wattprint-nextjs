import { readCharacter } from "@bible-strong/avatar-core"
import { afterEach, describe, expect, it, vi } from "vitest"

import { wappiCharacter as character } from "@workspace/ui-patterns/wappi"

import nextConfig from "../../next.config"

describe("Ajv in the browser bundle", () => {
  afterEach(() => vi.restoreAllMocks())

  it("is aliased to the eval-free stub for the browser only", () => {
    expect(nextConfig.turbopack?.resolveAlias?.["ajv/dist/2020.js"]).toEqual({
      browser: "@workspace/ui-patterns/ajv-browser",
    })
  })

  it("the stub compiles without evaluating code", async () => {
    const evaluate = vi.spyOn(globalThis, "Function")
    const { Ajv2020 } = await import("@workspace/ui-patterns/ajv-browser")
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile({})
    expect(validate(character)).toBe(true)
    expect(validate.errors).toBeNull()
    expect(evaluate).not.toHaveBeenCalled()
  })

  // The stub trusts the character: real Ajv (Node) keeps checking it here.
  it("Wappi's character passes avatar-core's real validation", () => {
    expect(readCharacter(character).ok).toBe(true)
  })
})
