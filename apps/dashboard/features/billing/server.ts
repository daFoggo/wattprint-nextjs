import "server-only"

import { apiFetch } from "@/lib/http"

import { CurrentBillSchema } from "./schemas"

export async function fetchCurrentBill(token: string) {
  return CurrentBillSchema.parse(await apiFetch("/billing/current", { token }))
}
