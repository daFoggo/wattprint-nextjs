"use client"

import { useSearchParams } from "next/navigation"

import type { Plan } from "../schemas"
import { PlanBuilder } from "./plan-builder"
import type { PlanData } from "./plan-data"
import { PlanProgress } from "./plan-progress"

/** The plan page's client side: the running plan's progress, or the builder when there is none. */
export function SavingsPlan({
  data,
  plan,
}: {
  data: PlanData
  plan: Plan | null
}) {
  const preselect = useSearchParams().getAll("add")
  if (plan)
    return (
      <PlanProgress
        data={data}
        plan={plan}
        labels={Object.fromEntries(data.advice.map((a) => [a.id, a.label]))}
      />
    )
  // Keyed by the ids: Wappi's panel stays open on this page, so a new `?add=` must pick again.
  return (
    <PlanBuilder key={preselect.join(",")} data={data} preselect={preselect} />
  )
}
