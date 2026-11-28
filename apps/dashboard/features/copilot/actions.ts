"use server"

import { z } from "zod"

import { requirePermission } from "@/lib/dal"

import { ConsentSchema, toMessages, type Purpose } from "./schemas"
import {
  deleteConversations,
  fetchConsents,
  fetchConversation,
  fetchConversations,
  fetchWatchStatuses,
  patchConversation,
  putConsent,
  putFeedback,
} from "./server"

// The chat's history and settings, called from the client provider. Every id is checked here (the trust
// boundary); a conversation that is not the caller's is a 404 on the backend.

const Id = z.uuid()

export async function listConversationsAction() {
  const { accessToken } = await requirePermission("account:view")
  return (await fetchConversations(accessToken)).map((c) => ({
    id: c.id,
    title: c.title ?? undefined,
    pinned: c.pinned,
    updatedAt: c.updated_at,
  }))
}

export async function loadConversationAction(id: string) {
  const { accessToken } = await requirePermission("account:view")
  const c = await fetchConversation(accessToken, Id.parse(id))
  const hasWatch = c.messages.some((m) =>
    m.reply?.widgets.some((w) => w.kind === "watch")
  )
  // The statuses only mark ended watches: when they cannot be read the chat still opens, its watches shown as live
  // (an exception to "a failed read throws", .claude/rules/dashboard-data.md).
  const watches = hasWatch
    ? await fetchWatchStatuses(accessToken).catch((error: unknown) => {
        console.error("copilot: watch statuses unavailable", error)
        return []
      })
    : []
  return toMessages(c, watches)
}

export async function updateConversationAction(
  id: string,
  patch: { title?: string; pinned?: boolean }
) {
  const { accessToken } = await requirePermission("account:view")
  const valid = z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      pinned: z.boolean().optional(),
    })
    .strict()
    .parse(patch)
  await patchConversation(accessToken, Id.parse(id), valid)
}

export async function deleteConversationsAction() {
  const { accessToken } = await requirePermission("account:view")
  await deleteConversations(accessToken)
}

export async function rateAnswerAction(
  messageId: string,
  value: "up" | "down" | null,
  shareContent = false
) {
  const { accessToken } = await requirePermission("account:view")
  await putFeedback(
    accessToken,
    Id.parse(messageId),
    z.enum(["up", "down"]).nullable().parse(value),
    // Content leaves only on an explicit true.
    shareContent === true
  )
}

export async function listConsentsAction() {
  const { accessToken } = await requirePermission("account:view")
  return fetchConsents(accessToken)
}

export async function setConsentAction(purpose: Purpose, granted: boolean) {
  const { accessToken } = await requirePermission("account:view")
  await putConsent(
    accessToken,
    ConsentSchema.shape.purpose.parse(purpose),
    z.boolean().parse(granted)
  )
}
