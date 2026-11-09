import "server-only"

import { cacheLife } from "next/cache"

import { requirePermission } from "@/lib/dal"

import { fetchMe } from "./server"

export async function getMe() {
  "use cache: private" // token-bound: browser only, never stored on the server
  cacheLife({ stale: 30, revalidate: 30, expire: 300 })
  const session = await requirePermission("account:view")
  return fetchMe(session.accessToken)
}
