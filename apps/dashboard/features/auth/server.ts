import "server-only"

import { authConfig } from "@workspace/auth/config"
import { headers } from "next/headers"

import { apiFetch } from "@/lib/http"

import { DemoHomesSchema, DemoTokensSchema } from "./schemas"

export async function fetchDemoHomes() {
  return DemoHomesSchema.parse(await apiFetch("/demo/homes"))
}

/**
 * The backend signs demo visitors in only for this app (our client secret) and caps them per visitor,
 * so it gets the address the edge proxy saw (nginx sets `X-Real-IP` and replaces `X-Forwarded-For`).
 */
export async function createDemoSession(house: string) {
  const h = await headers()
  const visitor =
    h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""
  return DemoTokensSchema.parse(
    await apiFetch("/demo/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Demo-Secret": authConfig.KEYCLOAK_CLIENT_SECRET,
        "X-Demo-Visitor": visitor.slice(0, 64),
      },
      body: JSON.stringify({ house }),
    })
  )
}
