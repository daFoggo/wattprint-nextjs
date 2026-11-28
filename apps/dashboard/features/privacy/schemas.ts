import { z } from "zod"

/** GET /homes/current/privacy: what is kept of the home's use, for how long, since when. */
export const PrivacySchema = z.object({
  levels: z.array(
    z.object({
      level: z.enum(["raw", "1m", "1h", "1d"]),
      /** Null: nothing drops it. */
      keep_days: z.number().int().nullable(),
      /** Null: nothing stored. */
      oldest: z.iso.date().nullable(),
    })
  ),
  erased_before: z.iso.date().nullable(),
  can_erase: z.boolean(),
})
export type Privacy = z.infer<typeof PrivacySchema>

/** The two fields of GET /homes/current this page needs. */
export const AiHomeSchema = z.object({
  role: z.enum(["owner", "member", "viewer"]),
  ai_detail_effective: z.enum(["daily", "hourly"]),
})
export type AiDetail = z.infer<typeof AiHomeSchema>["ai_detail_effective"]

export const ConsentsSchema = z.array(
  z.object({
    purpose: z.enum(["wappi", "voice", "email"]),
    granted: z.boolean(),
  })
)

export const OutboundSchema = z.array(
  z.object({
    created_at: z.iso.datetime({ offset: true }),
    party: z.string(),
    purpose: z.string(),
    data: z.array(z.string()),
    detail: z.string().nullable(),
  })
)
export type Outbound = z.infer<typeof OutboundSchema>

// Asia/Ho_Chi_Minh has no DST.
const ICT = 7 * 3_600_000

/** One line per local day, receiver, kinds of data and detail, with how many calls: newest first, as they came. */
export function groupOutbound(rows: Outbound) {
  const groups = new Map<
    string,
    {
      day: string
      party: string
      data: string[]
      detail: string | null
      count: number
    }
  >()
  for (const { created_at, party, data, detail } of rows) {
    const day = new Date(Date.parse(created_at) + ICT)
      .toISOString()
      .slice(0, 10)
    const key = JSON.stringify([day, party, data, detail])
    const group = groups.get(key)
    if (group) group.count++
    else groups.set(key, { day, party, data, detail, count: 1 })
  }
  return [...groups.values()]
}
