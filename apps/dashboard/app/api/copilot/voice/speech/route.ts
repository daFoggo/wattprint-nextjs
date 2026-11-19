import type { NextRequest } from "next/server"
import { connection } from "next/server"
import { z } from "zod"

import { speech } from "@/features/copilot/server"
import { requirePermission } from "@/lib/dal"

import { failure } from "../../respond"

const Query = z.object({ message: z.uuid(), lang: z.enum(["vi", "en"]) })

/**
 * One of Wappi's answers read aloud, as an MP3 stream an <audio> plays as it arrives (a GET, so it can be its
 * src). Stopping the audio ends this request, which stops the backend voicing the rest.
 */
export async function GET(request: NextRequest) {
  await connection()
  const { accessToken } = await requirePermission("account:view")
  const query = Query.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  )
  if (!query.success)
    return Response.json(
      { code: "invalid", detail: "Bad message" },
      { status: 422 }
    )
  try {
    const upstream = await speech(
      accessToken,
      query.data.message,
      query.data.lang,
      request.signal
    )
    return new Response(upstream.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    })
  } catch (error) {
    return failure(error)
  }
}
