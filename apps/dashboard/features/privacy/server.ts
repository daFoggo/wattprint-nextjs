import "server-only"

import { apiFetch } from "@/lib/http"

import {
  AiHomeSchema,
  ConsentsSchema,
  OutboundSchema,
  PrivacySchema,
  type AiDetail,
} from "./schemas"

export async function fetchPrivacy(token: string) {
  return PrivacySchema.parse(
    await apiFetch("/homes/current/privacy", { token })
  )
}

export async function fetchAiHome(token: string) {
  return AiHomeSchema.parse(await apiFetch("/homes/current", { token }))
}

export async function fetchConsents(token: string) {
  return ConsentsSchema.parse(await apiFetch("/users/me/consents", { token }))
}

export async function fetchOutbound(token: string) {
  return OutboundSchema.parse(await apiFetch("/users/me/outbound", { token }))
}

export async function patchAiDetail(token: string, ai_detail: AiDetail) {
  await apiFetch("/homes/current", {
    token,
    method: "PATCH",
    body: JSON.stringify({ ai_detail }),
    headers: { "Content-Type": "application/json" },
  })
}

/** All of it without `before`. */
export async function deleteHistory(token: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : ""
  await apiFetch(`/homes/current/history${query}`, { token, method: "DELETE" })
}
