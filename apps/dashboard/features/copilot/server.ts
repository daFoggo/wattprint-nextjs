import "server-only"

import { z } from "zod"

import { apiFetch, apiResponse } from "@/lib/http"

import {
  ConversationSchema,
  ConversationSummarySchema,
  TranscriptSchema,
} from "./schemas"

const json = (body: unknown) => ({
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
})

export async function fetchConversations(token: string) {
  return z
    .array(ConversationSummarySchema)
    .parse(await apiFetch("/copilot/conversations", { token }))
}

export async function fetchConversation(token: string, id: string) {
  return ConversationSchema.parse(
    await apiFetch(`/copilot/conversations/${encodeURIComponent(id)}`, {
      token,
    })
  )
}

export async function patchConversation(
  token: string,
  id: string,
  patch: { title?: string; pinned?: boolean }
) {
  return ConversationSummarySchema.parse(
    await apiFetch(`/copilot/conversations/${encodeURIComponent(id)}`, {
      token,
      method: "PATCH",
      ...json(patch),
    })
  )
}

export async function deleteConversation(token: string, id: string) {
  await apiFetch(`/copilot/conversations/${encodeURIComponent(id)}`, {
    token,
    method: "DELETE",
  })
}

export async function putFeedback(
  token: string,
  messageId: string,
  value: "up" | "down" | null
) {
  await apiFetch(
    `/copilot/messages/${encodeURIComponent(messageId)}/feedback`,
    { token, method: "PUT", ...json({ value }) }
  )
}

export async function acceptPlan(token: string, planId: string) {
  return z.object({ id: z.string(), status: z.string() }).parse(
    await apiFetch(`/copilot/plans/${encodeURIComponent(planId)}/accept`, {
      token,
      method: "POST",
    })
  )
}

/** The answer's event stream, passed on as it comes. */
export async function streamChat(token: string, body: unknown) {
  return apiResponse("/copilot/chat", {
    token,
    method: "POST",
    ...json(body),
    headers: { ...json(body).headers, Accept: "text/event-stream" },
  })
}

export async function transcribe(
  token: string,
  audio: ArrayBuffer,
  contentType: string,
  lang: string
) {
  return TranscriptSchema.parse(
    await apiFetch(`/copilot/voice/transcribe?lang=${lang}`, {
      token,
      method: "POST",
      body: audio,
      headers: { "Content-Type": contentType },
    })
  )
}

/** One of Wappi's answers read aloud: an MP3 stream, stopped when `signal` aborts. */
export async function speech(
  token: string,
  messageId: string,
  lang: "vi" | "en",
  signal: AbortSignal
) {
  return apiResponse(`/copilot/messages/${messageId}/speech?lang=${lang}`, {
    token,
    signal,
  })
}
