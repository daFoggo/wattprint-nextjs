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
