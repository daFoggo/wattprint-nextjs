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
