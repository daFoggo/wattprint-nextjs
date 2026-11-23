import "server-only"

import type { DemoHome } from "./schemas"
import { fetchDemoHomes } from "./server"

/**
 * The seeded demo homes, public (no session). The demo button is optional: when the backend is down
 * it is left out and the other sign-in buttons still work, so a failure becomes no homes, logged.
 */
export async function getDemoHomes(): Promise<DemoHome[]> {
  try {
    return await fetchDemoHomes()
  } catch (error) {
    console.error("demo homes unavailable", error)
    return []
  }
}
