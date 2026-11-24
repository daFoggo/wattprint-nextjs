import "server-only"

import { getLocale } from "next-intl/server"
import { io } from "next/cache"
import { headers } from "next/headers"
// eslint-disable-next-line no-restricted-imports -- redirects to getPathname({ locale }) or /auth/expired (outside [locale]) (docs/internationalization.md)
import { redirect } from "next/navigation"

import { SIGN_IN_PATH } from "@/config/routes"
import { getPathname } from "@/i18n/navigation"

import { getAuthProvider } from "./auth"
import { sessionExpiredPath } from "./dal"
import { env } from "./env"
import { ApiError } from "./errors"
import { apiUrl } from "./url"

type ApiFetchOptions = Omit<RequestInit, "headers"> & {
  /** Bearer token; obtain it from the DAL and pass it in. */
  token?: string
  headers?: Record<string, string>
}

/**
 * Thin fetch wrapper for the backend. Resolves with parsed JSON or throws
 * `ApiError`; it never returns fallback data for failures.
 * Only feature `server.ts` files may import this module.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const res = await apiResponse(path, {
    ...options,
    headers: { Accept: "application/json", ...options.headers },
  })
  if (res.status === 204) {
    return undefined as T
  }
  const text = await res.text()
  if (!text) {
    return undefined as T
  }
  return JSON.parse(text) as T
}

/**
 * The backend's response as it comes (a stream, audio), for a Route Handler to pass on; a failure
 * throws `ApiError` as `apiFetch` does.
 */
export async function apiResponse(
  path: string,
  { token, headers, ...init }: ApiFetchOptions = {}
): Promise<Response> {
  // fetch reads the clock: run it at request time, never while prerendering (a cached session gets here during
  // the prerender; Date.now() there is a blocking route). Resolves at once inside cache scopes and at request time.
  await io()
  let res: Response
  try {
    res = await fetch(apiUrl(env.API_BASE_URL, path), {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch (error) {
    throw new ApiError(
      503,
      `Backend service unreachable (${env.API_BASE_URL}). Please verify that FastAPI backend is running on port 11093.`,
      error
    )
  }

  if (!res.ok) {
    // A token the session still holds was rejected: end the session.
    if (res.status === 401 && token) await endRejectedSession()
    const body = await res.json().catch(() => undefined)
    // The backend answers with RFC 7807 problem details ({ title, detail, status }).
    const detail =
      body &&
      typeof body === "object" &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : undefined
    throw new ApiError(
      res.status,
      detail ?? `Request failed with status ${res.status}`,
      body
    )
  }

  return res
}

/**
 * Renders cannot write cookies, so they go through the route that clears the session.
 * A Server Action can only soft-navigate to a page (redirecting it to that route leaves the
 * client stuck on the old UI), so it signs out itself and goes straight to sign-in.
 */
export async function endRejectedSession(): Promise<never> {
  if ((await headers()).has("next-action")) {
    try {
      await (await getAuthProvider()).signOut()
    } catch {
      // Still leave: the proxy cannot refresh a rejected session either.
    }
    redirect(getPathname({ href: SIGN_IN_PATH, locale: await getLocale() }))
  }
  redirect(await sessionExpiredPath())
}
