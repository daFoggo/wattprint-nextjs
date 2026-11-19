import { stateGroups, stateNames } from "@bible-strong/avatar-core"
import { describe, expect, it } from "vitest"

import { answerState, MOODS, TOOL_STATES } from "../moods"

const answer = {
  id: "a",
  role: "assistant" as const,
  steps: [],
  text: "",
  feedback: null,
}

describe("Wappi's moods", () => {
  it("only name states the catalogue has, and that keep a face", () => {
    const spinners = stateGroups.find((g) => g.label === "Spinners")!.states
    for (const state of [
      ...Object.values(MOODS),
      ...Object.values(TOOL_STATES),
    ]) {
      expect(stateNames).toContain(state)
      expect(spinners).not.toContain(state)
    }
  })

  it("follow an answer from the tool it runs to how it was rated", () => {
    const working = { ...answer, phase: "working" as const }
    expect(
      answerState({
        ...working,
        steps: [{ tool: "query_data", label: "", detail: "" }],
      })
    ).toBe("coding")
    expect(
      answerState({ ...working, steps: [{ label: "", detail: "" }] })
    ).toBe(MOODS.working)
    expect(
      answerState({ ...answer, phase: "error", error: "copilot_rate_limited" })
    ).toBe(MOODS.tired)
    expect(answerState({ ...answer, phase: "done", feedback: "down" })).toBe(
      MOODS.disliked
    )
  })
})
