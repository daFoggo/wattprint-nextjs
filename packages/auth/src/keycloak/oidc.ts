import { randomBytes, createHash } from "node:crypto"

export type KeycloakOidcConfig = {
  issuer: string
  clientId: string
  clientSecret: string
}

export type KeycloakTokenResponse = {
  access_token: string
  refresh_token?: string
  id_token?: string
  expires_in: number
  refresh_expires_in?: number
}

export function getKeycloakEndpoints(issuer: string) {
  const base = issuer.replace(/\/+$/, "")
  return {
    auth: `${base}/protocol/openid-connect/auth`,
    token: `${base}/protocol/openid-connect/token`,
    userinfo: `${base}/protocol/openid-connect/userinfo`,
    logout: `${base}/protocol/openid-connect/logout`,
    certs: `${base}/protocol/openid-connect/certs`,
  }
}

export function createPkceChallenge() {
  const codeVerifier = randomBytes(32).toString("base64url")
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")
  const state = randomBytes(24).toString("base64url")
  return { state, codeVerifier, codeChallenge }
}

export function buildAuthorizationUrl(
  config: KeycloakOidcConfig,
  params: {
    redirectUri: string
    state: string
    codeChallenge: string
    /** Identity provider alias (`kc_idp_hint`): skips Keycloak's login page and goes straight to it. */
    provider?: string
    /** Language of Keycloak's pages (`ui_locales`). */
    locale?: string
  }
): string {
  const endpoints = getKeycloakEndpoints(config.issuer)
  const targetUrl = new URL(endpoints.auth)

  targetUrl.searchParams.set("client_id", config.clientId)
  targetUrl.searchParams.set("response_type", "code")
  targetUrl.searchParams.set("scope", "openid profile email roles")
  targetUrl.searchParams.set("redirect_uri", params.redirectUri)
  targetUrl.searchParams.set("state", params.state)
  targetUrl.searchParams.set("code_challenge", params.codeChallenge)
  targetUrl.searchParams.set("code_challenge_method", "S256")

  if (params.provider) targetUrl.searchParams.set("kc_idp_hint", params.provider)
  if (params.locale) targetUrl.searchParams.set("ui_locales", params.locale)

  return targetUrl.toString()
}

export async function exchangeAuthorizationCode(
  config: KeycloakOidcConfig,
  params: {
    code: string
    codeVerifier: string
    redirectUri: string
  }
): Promise<KeycloakTokenResponse> {
  const endpoints = getKeycloakEndpoints(config.issuer)
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: params.code,
    code_verifier: params.codeVerifier,
    redirect_uri: params.redirectUri,
  })

  const res = await fetch(endpoints.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${errorText}`)
  }

  return (await res.json()) as KeycloakTokenResponse
}

/** A refresh the IdP answered with an HTTP error; `status` tells a rejected token (4xx) from an outage (5xx). */
export class KeycloakTokenError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message)
    this.name = "KeycloakTokenError"
  }
}

// Refresh tokens are single use (realm `revokeRefreshToken`), but one page load fires several requests that
// carry the same cookie. The first refresh wins; the rest share its answer for a few seconds, per process.
const REFRESH_SHARE_MS = 10_000
const inFlight = new Map<string, Promise<KeycloakTokenResponse>>()

export function refreshKeycloakTokens(
  config: KeycloakOidcConfig,
  refreshToken: string
): Promise<KeycloakTokenResponse> {
  let shared = inFlight.get(refreshToken)
  if (!shared) {
    shared = requestRefresh(config, refreshToken)
    inFlight.set(refreshToken, shared)
    // A failure must not be replayed: a later request retries (outage) or sees the IdP's answer again.
    // The share window starts when the answer arrives, so a slow IdP never lets a second refresh start.
    shared.then(
      () => setTimeout(() => inFlight.delete(refreshToken), REFRESH_SHARE_MS).unref?.(),
      () => inFlight.delete(refreshToken)
    )
  }
  return shared
}

async function requestRefresh(
  config: KeycloakOidcConfig,
  refreshToken: string
): Promise<KeycloakTokenResponse> {
  const endpoints = getKeycloakEndpoints(config.issuer)
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  })

  const res = await fetch(endpoints.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const errorText = await res.text()
    let code: string | undefined
    try {
      code = (JSON.parse(errorText) as { error?: string }).error
    } catch {
      // not JSON: no code
    }
    throw new KeycloakTokenError(
      res.status,
      `Token refresh failed (${res.status}): ${errorText}`,
      code
    )
  }

  return (await res.json()) as KeycloakTokenResponse
}

export async function fetchKeycloakUserInfo(
  config: KeycloakOidcConfig,
  accessToken: string
): Promise<Record<string, unknown> | null> {
  const endpoints = getKeycloakEndpoints(config.issuer)
  try {
    const res = await fetch(endpoints.userinfo, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

/** RP-initiated logout: the browser is sent here, Keycloak ends the SSO session and returns to `redirectTo`. */
export function buildEndSessionUrl(
  config: KeycloakOidcConfig,
  params: { idTokenHint: string; redirectTo: string }
): string {
  const url = new URL(getKeycloakEndpoints(config.issuer).logout)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("id_token_hint", params.idTokenHint)
  url.searchParams.set("post_logout_redirect_uri", params.redirectTo)
  return url.toString()
}

export async function logoutKeycloakSession(
  config: KeycloakOidcConfig,
  refreshToken: string
): Promise<void> {
  const endpoints = getKeycloakEndpoints(config.issuer)
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  })

  const res = await fetch(endpoints.logout, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  // The caller still clears the local cookies; say so when the IdP session survives.
  if (!res.ok) {
    console.warn(
      `[keycloak] logout rejected (${res.status}): the SSO session may still be active`
    )
  }
}
