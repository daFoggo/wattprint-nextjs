"use client"

import { catchError } from "next/error"

/**
 * An error boundary that renders nothing: for decoration the page works without (the weather
 * card). The error still reaches the server log; it is not swallowed like a `.catch(() => null)`.
 */
export const HideOnError = catchError(() => null)
