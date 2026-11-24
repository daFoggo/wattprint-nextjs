import "server-only"

import { apiFetch } from "@/lib/http"

import { DemoHomesSchema } from "./schemas"

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
