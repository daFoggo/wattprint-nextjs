import { connection } from "next/server"

import { transcribe } from "@/features/copilot/server"
import { requirePermission } from "@/lib/dal"

import { failure } from "../../respond"

const MAX = 10 * 1024 * 1024 // the backend's limit too

/** Speech to text: the body is the recording; `?lang=vi|en`. */
export async function POST(request: Request) {
  await connection()
  const { accessToken } = await requirePermission("account:view")
  const type = request.headers.get("content-type") ?? ""
  const lang =
    new URL(request.url).searchParams.get("lang") === "en" ? "en" : "vi"
  // Refused before reading when the size is declared too large; checked again once read.
  if (Number(request.headers.get("content-length") ?? 0) > MAX)
    return Response.json(
      { code: "audio_too_large", detail: "Recording over 10 MB" },
      { status: 413 }
    )
  const audio = await request.arrayBuffer()
  if (!type.startsWith("audio/") || !audio.byteLength || audio.byteLength > MAX)
    return Response.json(
      { code: "audio_invalid", detail: "Bad recording" },
      { status: 422 }
    )
  try {
    return Response.json(await transcribe(accessToken, audio, type, lang))
  } catch (error) {
    return failure(error)
  }
}
