import "server-only"

import { z } from "zod"

import { apiFetch } from "@/lib/http"

import { OverviewSchema, SeriesPointSchema } from "./schemas"

export async function fetchOverview(token: string) {
  return OverviewSchema.parse(await apiFetch("/energy/overview", { token }))
}

export async function fetchSeries(
  token: string,
  since: Date,
  until: Date,
  maxPoints: number
) {
  const query = new URLSearchParams({
    since: since.toISOString(),
    until: until.toISOString(),
    max_points: String(maxPoints),
  })
  return z
    .array(SeriesPointSchema)
    .parse(await apiFetch(`/energy/series?${query}`, { token }))
}
