import { z } from "zod"

// Only the fields the dashboard reads; Zod drops the rest of each backend response.
const Instant = z.iso.datetime({ offset: true })

export const PowerSchema = z.object({ ts: Instant, watts: z.number() })

export const OverviewSchema = z.object({ live: PowerSchema.nullable() })

export const SeriesPointSchema = z.object({
  ts: Instant,
  energy_wh: z.number(),
})
