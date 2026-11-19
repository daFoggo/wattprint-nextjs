import "server-only"

import { z } from "zod"

import { apiFetch } from "@/lib/http"

import { AlertSchema, CohortSchema } from "./schemas"

export async function fetchCohort(token: string) {
  return CohortSchema.parse(await apiFetch("/insights/cohort", { token }))
}

export async function fetchAlerts(token: string) {
  return z
    .array(AlertSchema)
    .parse(await apiFetch("/insights/alerts?limit=20", { token }))
}

export async function acknowledgeAlert(token: string, id: string) {
  await apiFetch(`/insights/alerts/${encodeURIComponent(id)}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ status: "acknowledged" }),
    headers: { "Content-Type": "application/json" },
  })
}
