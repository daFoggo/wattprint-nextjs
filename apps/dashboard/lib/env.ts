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
  API_BASE_URL: z.url().default("http://localhost:8000/api/v1"),
})

export type ServerEnv = z.infer<typeof serverSchema>

export function parseServerEnv(
  raw: Record<string, string | undefined> = process.env
): ServerEnv {
  return serverSchema.parse({ API_BASE_URL: raw.API_BASE_URL || undefined })
}

export const env = parseServerEnv()
