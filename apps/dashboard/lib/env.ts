import "server-only"

import { z } from "zod"

/**
 * Validated server-side environment. Server-only: secrets never reach the client.
 * Public (`NEXT_PUBLIC_*`) variables live in `env.public.ts`; the Keycloak variables in `@workspace/auth/config`.
 *
 * Every variable read here must also be declared in `turbo.json` (`build.env`),
 * otherwise Turborepo's strict env mode hides it from the task.
 */
const serverSchema = z.object({
  API_BASE_URL: z.url().default("http://localhost:11093/api/v1"),
  // Unset: the Overview page head has no weather card.
  OPENWEATHER_API_KEY: z.string().optional(),
  // shortcut: one place for every home (Hanoi); read the home's location once homes have one.
  WEATHER_LAT: z.coerce.number().min(-90).max(90).default(21.0285),
  WEATHER_LON: z.coerce.number().min(-180).max(180).default(105.8542),
})

export type ServerEnv = z.infer<typeof serverSchema>

export function parseServerEnv(
  raw: Record<string, string | undefined> = process.env
): ServerEnv {
  return serverSchema.parse({
    API_BASE_URL: raw.API_BASE_URL || undefined,
    OPENWEATHER_API_KEY: raw.OPENWEATHER_API_KEY || undefined,
    WEATHER_LAT: raw.WEATHER_LAT || undefined,
    WEATHER_LON: raw.WEATHER_LON || undefined,
  })
}

export const env = parseServerEnv()
