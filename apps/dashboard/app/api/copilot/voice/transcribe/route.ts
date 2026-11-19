import { connection } from "next/server"

import { transcribe } from "@/features/copilot/server"
import { requirePermission } from "@/lib/dal"

import { failure, readLimited, tooLarge } from "../../respond"

const MAX = 10 * 1024 * 1024 // the backend's limit too

/** Speech to text: the body is the recording; `?lang=vi|en`. */
export async function POST(request: Request) {
  await connection()
  const { accessToken } = await requirePermission("account:view")
  const type = request.headers.get("content-type") ?? ""
  const lang =
    new URL(request.url).searchParams.get("lang") === "en" ? "en" : "vi"
  if (!type.startsWith("audio/"))
    return Response.json(
      { code: "audio_invalid", detail: "Not a recording" },
      { status: 422 }
    )
  const audio = await readLimited(request, MAX)
  if (!audio) return tooLarge()
  if (!audio.byteLength)
    return Response.json(
      { code: "audio_invalid", detail: "Empty recording" },
      { status: 422 }
    )
  try {
    return Response.json(
      await transcribe(accessToken, audio.buffer as ArrayBuffer, type, lang)
    )
  } catch (error) {
    return failure(error)
  }
}
