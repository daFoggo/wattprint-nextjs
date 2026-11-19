"use server"

import { z } from "zod"

import { requirePermission } from "@/lib/dal"

import { toMessages } from "./schemas"
import {
  acceptPlan,
  deleteConversation,
  fetchConversation,
  fetchConversations,
  patchConversation,
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
  return toMessages(await fetchConversation(accessToken, Id.parse(id)))
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

export async function deleteConversationAction(id: string) {
  const { accessToken } = await requirePermission("account:view")
  await deleteConversation(accessToken, Id.parse(id))
}

export async function rateAnswerAction(
  messageId: string,
  value: "up" | "down" | null
) {
  const { accessToken } = await requirePermission("account:view")
  await putFeedback(
    accessToken,
    Id.parse(messageId),
    z.enum(["up", "down"]).nullable().parse(value)
  )
}

/** Starts trying a plan Wappi saved; its saving is measured after 14 days. */
export async function acceptPlanAction(planId: string) {
  const { accessToken } = await requirePermission("account:view")
  return (await acceptPlan(accessToken, Id.parse(planId))).status
}
