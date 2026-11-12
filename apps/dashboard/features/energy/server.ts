import "server-only"

import { z } from "zod"

import { env } from "@/lib/env"
import { apiFetch } from "@/lib/http"
import { apiUrl } from "@/lib/url"

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

/** The backend's event stream, piped through as is: apiFetch parses JSON, a stream must not be read. */
export function openEnergyStream(token: string, signal: AbortSignal) {
  return fetch(apiUrl(env.API_BASE_URL, "/energy/stream"), {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  })
}
