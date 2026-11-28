import "server-only"

import { z } from "zod"

import { apiFetch, apiResponse } from "@/lib/http"

import {
  ConsentSchema,
  ConversationSchema,
  ConversationSummarySchema,
  TranscriptSchema,
  type Purpose,
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

/** The watches' statuses only, to show which watch widgets in a stored chat have ended. */
export async function fetchWatchStatuses(token: string) {
  return z
    .array(z.object({ id: z.string(), status: z.string() }))
    .parse(await apiFetch("/insights/watches", { token }))
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

export async function deleteConversations(token: string) {
  await apiFetch("/copilot/conversations", { token, method: "DELETE" })
}

export async function putFeedback(
  token: string,
  messageId: string,
  value: "up" | "down" | null,
  shareContent = false
) {
  await apiFetch(
    `/copilot/messages/${encodeURIComponent(messageId)}/feedback`,
    { token, method: "PUT", ...json({ value, share_content: shareContent }) }
  )
}

export async function fetchConsents(token: string) {
  return z
    .array(ConsentSchema)
    .parse(await apiFetch("/users/me/consents", { token }))
}

/** Each call is a new record on the backend; withdrawing is `granted: false`. */
export async function putConsent(
  token: string,
  purpose: Purpose,
  granted: boolean
) {
  return ConsentSchema.parse(
    await apiFetch(`/users/me/consents/${purpose}`, {
      token,
      method: "PUT",
      ...json({ granted }),
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
