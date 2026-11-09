import "server-only"

import { apiFetch } from "@/lib/http"

import { MeSchema } from "./schemas"

export async function fetchMe(token: string) {
  return MeSchema.parse(await apiFetch("/users/me", { token }))
}
