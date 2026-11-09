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

  // Skips Keycloak's own login form: Google is the only way in (realm registration is off).
  targetUrl.searchParams.set("kc_idp_hint", "google")

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
    message: string
  ) {
    super(message)
    this.name = "KeycloakTokenError"
  }
}

export async function refreshKeycloakTokens(
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
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new KeycloakTokenError(
      res.status,
      `Token refresh failed (${res.status}): ${errorText}`
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
