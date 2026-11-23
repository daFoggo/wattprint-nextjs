import { z } from "zod"

/** GET /demo/homes: the seeded REFIT homes a visitor can sign in as, with their appliances. */
export const DemoHomesSchema = z.array(
  z.object({
    key: z.string(),
    house: z.number(),
    name: z.string(),
    devices: z.array(z.object({ label: z.string(), name: z.string() })),
  })
)

export type DemoHome = z.infer<typeof DemoHomesSchema>[number]

/** POST /demo/session: Keycloak tokens for the home's owner, minted for the web client. */
export const DemoTokensSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  id_token: z.string(),
  expires_in: z.number(),
  refresh_expires_in: z.number(),
})
