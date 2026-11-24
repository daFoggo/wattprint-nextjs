import "server-only"

import { headers } from "next/headers"

import { demoGuestSecret } from "@/lib/dal"
import { apiFetch } from "@/lib/http"

import { DemoHomesSchema, DemoTokensSchema } from "./schemas"

export async function fetchDemoHomes() {
  return DemoHomesSchema.parse(await apiFetch("/demo/homes"))
}

/** Makes the account a read-only viewer of that demo home (the backend refuses members of a real home). */
export async function viewDemoHome(token: string, key: string) {
  await apiFetch(`/demo/homes/${encodeURIComponent(key)}/view`, {
    token,
    method: "POST",
  })
}

/**
 * A new guest account viewing that demo home, signed in for this app. The backend makes guests only for us (our
 * client secret) and caps them per visitor, so it gets the address the edge proxy saw (nginx sets `X-Real-IP`).
 */
export async function createDemoGuest(key: string) {
  const h = await headers()
  const visitor =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  return DemoTokensSchema.parse(
    await apiFetch(`/demo/homes/${encodeURIComponent(key)}/guest`, {
      method: "POST",
      headers: {
        "X-Demo-Secret": demoGuestSecret(),
        "X-Demo-Visitor": visitor.slice(0, 64),
      },
    })
  )
}
