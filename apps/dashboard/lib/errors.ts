/** Error thrown when the backend answers with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/**
 * The request was understood and rejected (validation, conflict, rule): a backend `4xx`. Actions return it as
 * a value. Anything else, including Next's `redirect()`/`notFound()` signals, must be rethrown.
 */
export function isExpectedDataError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

/** The spec rule that refused a write (e.g. `TM-2`), from the problem details or the message prefix. */
export function ruleOf(error: ApiError): string | undefined {
  if (
    error.body &&
    typeof error.body === "object" &&
    "rule" in error.body
  ) {
    return String(error.body.rule)
  }
  return /^([A-Z]{2}-\d+):/.exec(error.message)?.[1]
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
