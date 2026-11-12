import { connection } from "next/server"

import { hasPermission } from "@workspace/auth/permissions"

import { openEnergyStream } from "@/features/energy/server"
import { getSession } from "@/lib/dal"

/**
 * The live energy stream (SSE) of the signed-in user's home, proxied so the token stays on the
 * server. `connection()` keeps prefetches from opening it (docs/advanced-patterns.md §4).
 * A non-200 answer ends the EventSource for good; the client then refreshes the route, which goes
 * through proxy.ts and renews the session, and opens a new one.
 */
export async function GET(request: Request) {
  await connection()
  const session = await getSession()
  if (!session) return new Response(null, { status: 401 })
  // The same permission the Overview page requires.
  if (!hasPermission(session.role, "account:view"))
    return new Response(null, { status: 403 })

  let upstream: Response
  try {
    upstream = await openEnergyStream(session.accessToken, request.signal)
  } catch {
    return new Response(null, { status: 502 }) // backend down, or the client already left
  }
  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.ok ? 502 : upstream.status })
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  })
}
