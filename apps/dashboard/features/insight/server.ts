import "server-only"

import { apiFetch } from "@/lib/http"

import { CohortSchema } from "./schemas"

export async function fetchCohort(token: string) {
  return CohortSchema.parse(await apiFetch("/insights/cohort", { token }))
}
