import "server-only"

import { cacheLife } from "next/cache"

import type { DemoHome } from "./schemas"
import { fetchDemoHomes } from "./server"

/** Public and the same for everyone; cached so the sign-in page's prerender can read them (a throw is not cached). */
async function cachedDemoHomes() {
  "use cache"
  cacheLife("hours")
  return fetchDemoHomes()
}

/**
 * The seeded demo homes, public (no session). The demo button is optional: when the backend is down
 * it is left out and the other sign-in buttons still work, so a failure becomes no homes, logged.
 */
export async function getDemoHomes(): Promise<DemoHome[]> {
  try {
    return await cachedDemoHomes()
  } catch (error) {
    console.error("demo homes unavailable", error)
    return []
  }
}
