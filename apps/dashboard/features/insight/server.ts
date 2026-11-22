import "server-only"

import { z } from "zod"

import { apiFetch } from "@/lib/http"

import {
  AlertSchema,
  CohortSchema,
  WatchSchema,
  type WatchCreate,
} from "./schemas"

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

export async function sendAlertFeedback(
  token: string,
  id: string,
  verdict: string
) {
  await apiFetch(`/insights/alerts/${encodeURIComponent(id)}/feedback`, {
    token,
    method: "POST",
    body: JSON.stringify({ verdict }),
    headers: { "Content-Type": "application/json" },
  })
}

export async function fetchWatches(token: string) {
  return z
    .array(WatchSchema)
    .parse(await apiFetch("/insights/watches", { token }))
}

export async function createWatch(token: string, body: WatchCreate) {
  return WatchSchema.parse(
    await apiFetch("/insights/watches", {
      token,
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    })
  )
}

export async function cancelWatch(token: string, id: string) {
  await apiFetch(`/insights/watches/${encodeURIComponent(id)}`, {
    token,
    method: "DELETE",
  })
}
