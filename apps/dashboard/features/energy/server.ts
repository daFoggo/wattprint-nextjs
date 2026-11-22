import "server-only"

import { z } from "zod"

import { ApiError } from "@/lib/errors"
import { apiFetch } from "@/lib/http"

import {
  ActivitySchema,
  DeviceApiSchema,
  DeviceDetailApiSchema,
  ExpectedHourSchema,
  OverviewSchema,
  SeriesPointSchema,
} from "./schemas"

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

export async function fetchDevices(token: string) {
  return z
    .array(DeviceApiSchema)
    .parse(await apiFetch("/energy/devices", { token }))
}

/** Null when the home has no such device (the backend's `device_not_found`). */
export async function fetchDevice(token: string, id: string) {
  try {
    return DeviceDetailApiSchema.parse(
      await apiFetch(`/energy/devices/${encodeURIComponent(id)}`, { token })
    )
  } catch (error) {
    const body = error instanceof ApiError ? error.body : undefined
    if ((body as { code?: string } | undefined)?.code === "device_not_found")
      return null
    throw error
  }
}

export async function fetchActivity(token: string) {
  return z
    .array(ActivitySchema)
    .parse(await apiFetch("/energy/activity", { token }))
}

export async function fetchExpected(token: string, from: Date, to: Date) {
  const query = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  })
  return z
    .array(ExpectedHourSchema)
    .parse(await apiFetch(`/expected?${query}`, { token }))
}
