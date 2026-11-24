import "server-only"

import { apiFetch } from "@/lib/http"

import {
  PlanBasisSchema,
  PlanHistorySchema,
  PlanRecordSchema,
  PlanSchema,
  type PlanCreate,
} from "./schemas"

export async function fetchPlan(token: string) {
  return PlanSchema.parse(await apiFetch("/insights/plans/current", { token }))
}

export async function fetchHistory(token: string) {
  return PlanHistorySchema.parse(
    await apiFetch("/insights/plans/history", { token })
  )
}

export async function fetchPlanById(token: string, id: string) {
  return PlanRecordSchema.parse(
    await apiFetch(`/insights/plans/${encodeURIComponent(id)}`, { token })
  )
}

export async function fetchBasis(token: string) {
  return PlanBasisSchema.parse(
    await apiFetch("/insights/plans/basis", { token })
  )
}

export async function createPlan(token: string, body: PlanCreate) {
  return PlanSchema.parse(
    await apiFetch("/insights/plans", {
      token,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  )
}

export async function stopPlan(token: string) {
  await apiFetch("/insights/plans/current", { token, method: "DELETE" })
}
