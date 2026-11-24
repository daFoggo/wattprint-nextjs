import "server-only"

import { z } from "zod"

import { apiFetch } from "@/lib/http"

import {
  CurrentBillSchema,
  DeviceForecastsSchema,
  ForecastSchema,
  PastBillSchema,
} from "./schemas"

export async function fetchCurrentBill(token: string) {
  return CurrentBillSchema.parse(await apiFetch("/billing/current", { token }))
}

export async function fetchBillHistory(token: string) {
  return z
    .array(PastBillSchema)
    .parse(await apiFetch("/billing/history", { token }))
}

export async function fetchForecast(token: string) {
  return ForecastSchema.parse(await apiFetch("/billing/forecast", { token }))
}

export async function fetchDeviceForecasts(token: string) {
  return DeviceForecastsSchema.parse(
    await apiFetch("/billing/devices/forecast", { token })
  )
}
