/** The landing's Wappi questions, in the order of their chips. */
export const QUESTIONS = ["costliest", "bill", "tier"] as const
export type Question = (typeof QUESTIONS)[number]
export type Phase = "idle" | "reading" | "working" | "done"

/** Where the band is. `run` changes on every pick, so the component's timers restart even for the same question. */
export type Step = { asked: Question | null; phase: Phase; run: number }

export const START: Step = { asked: null, phase: "idle", run: 0 }

export const ask = (step: Step, question: Question): Step => ({
  asked: question,
  phase: "reading",
  run: step.run + 1,
})

/** One beat on: reading → working → done; idle and done stay put. */
export const advance = (step: Step): Step =>
  step.phase === "reading"
    ? { ...step, phase: "working" }
    : step.phase === "working"
      ? { ...step, phase: "done" }
      : step
