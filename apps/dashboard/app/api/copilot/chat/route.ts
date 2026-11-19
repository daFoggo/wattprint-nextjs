import { connection } from "next/server"
import { z } from "zod"

import { streamChat } from "@/features/copilot/server"
import { requirePermission } from "@/lib/dal"

import { failure, jsonOf, readLimited, tooLarge } from "../respond"

const Body = z
  .object({
    conversation_id: z.uuid().optional(),
    question: z.string().trim().min(1).max(2000),
    lang: z.enum(["vi", "en"]),
  })
  .strict()

/** Wappi's answer as server-sent events, from the backend with the session's token (the token stays here). */
export async function POST(request: Request) {
  await connection()
  const { accessToken } = await requirePermission("account:view")
  const raw = await readLimited(request, 16_384) // a question is at most 2000 characters
  if (!raw) return tooLarge()
  const body = Body.safeParse(jsonOf(raw))
  if (!body.success)
    return Response.json(
      { code: "invalid", detail: "Bad question" },
      { status: 422 }
    )
  try {
    const upstream = await streamChat(accessToken, body.data)
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (error) {
    return failure(error)
  }
}
