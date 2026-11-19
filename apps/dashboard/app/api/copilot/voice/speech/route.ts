import { connection } from "next/server"
import { z } from "zod"

import { speech } from "@/features/copilot/server"
import { requirePermission } from "@/lib/dal"

import { failure, jsonOf, readLimited, tooLarge } from "../../respond"

/** Wappi's voice reading the text (MP3). */
export async function POST(request: Request) {
  await connection()
  const { accessToken } = await requirePermission("account:view")
  const raw = await readLimited(request, 16_384) // a question is at most 2000 characters
  if (!raw) return tooLarge()
  const body = z
    .object({ text: z.string().trim().min(1).max(1500) })
    .safeParse(jsonOf(raw))
  if (!body.success)
    return Response.json(
      { code: "invalid", detail: "Bad text" },
      { status: 422 }
    )
  try {
    const upstream = await speech(accessToken, body.data.text)
    return new Response(upstream.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    })
  } catch (error) {
    return failure(error)
  }
}
