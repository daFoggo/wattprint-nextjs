import "server-only"

import { ApiError } from "@/lib/errors"

/** A backend failure as JSON the client reads ({ code, detail }), with its status. */
export function failure(error: unknown) {
  if (!(error instanceof ApiError)) throw error
  const body = (error.body ?? {}) as { code?: string; detail?: string }
  return Response.json(
    { code: body.code ?? "error", detail: body.detail ?? error.message },
    { status: error.status }
  )
}

/**
 * The request body, read up to `max` bytes: null past it. Counts as it reads, so a chunked body
 * without Content-Length cannot fill the server's memory either.
 */
export async function readLimited(request: Request, max: number) {
  if (Number(request.headers.get("content-length") ?? 0) > max) return null
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > max) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const body = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    body.set(c, at)
    at += c.byteLength
  }
  return body
}

export const tooLarge = () =>
  Response.json(
    { code: "too_large", detail: "Request too large" },
    { status: 413 }
  )

/** The body as JSON, or null when it is not JSON (the schema then refuses it). */
export function jsonOf(raw: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(raw))
  } catch {
    return null
  }
}
