import type { Confidence } from "@/components/shared/model-badge"

/** Share of the energy the model could not put on a device ("Other"), 0 to 1. */
export function otherShare(slices: { type: string; kwh: number }[]) {
  const total = slices.reduce((s, d) => s + d.kwh, 0)
  const other = slices
    .filter((d) => d.type === "other")
    .reduce((s, d) => s + d.kwh, 0)
  return total > 0 ? other / total : 0
}

/** The more energy left as "Other", the less the per-device split says. */
export const mixConfidence = (other: number): Confidence =>
  other < 0.2 ? "high" : other < 0.4 ? "medium" : "low"
