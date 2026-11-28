import "server-only"

import { apiFetch } from "@/lib/http"

import {
  AiHomeSchema,
  ConsentsSchema,
  InviteSchema,
  MembersSchema,
  OutboundSchema,
  PrivacySchema,
  type AiDetail,
  type Member,
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

export async function fetchMembers(token: string) {
  return MembersSchema.parse(
    await apiFetch("/homes/current/members", { token })
  )
}

export async function createInvite(token: string) {
  return InviteSchema.parse(
    await apiFetch("/homes/current/invites", { token, method: "POST" })
  )
}

export async function patchMember(
  token: string,
  userId: string,
  detail: Member["detail"]
) {
  await apiFetch(`/homes/current/members/${encodeURIComponent(userId)}`, {
    token,
    method: "PATCH",
    body: JSON.stringify({ detail }),
    headers: { "Content-Type": "application/json" },
  })
}

export async function deleteMember(token: string, userId: string) {
  await apiFetch(`/homes/current/members/${encodeURIComponent(userId)}`, {
    token,
    method: "DELETE",
  })
}

export async function deleteMembership(token: string) {
  await apiFetch("/homes/current/membership", { token, method: "DELETE" })
}
