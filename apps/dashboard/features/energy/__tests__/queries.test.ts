import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
// React's `cache` memoizes only inside a server request; this stand-in keys by the arguments the same way.
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: <A extends unknown[], R>(fn: (...a: A) => R) => {
    const seen = new Map<string, R>()
    return (...a: A) => {
      const key = JSON.stringify(a)
      if (!seen.has(key)) seen.set(key, fn(...a))
      return seen.get(key)!
    }
  },
}))
vi.mock("next/cache", () => ({ io: async () => {} }))
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}))
vi.mock("@/lib/dal", () => ({
  requirePermission: async () => ({ accessToken: "token" }),
}))
const device = {
  id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  type: "kettle",
  tip: null,
  watts: 0,
  avg_on_w: 0,
  peak_w: 0,
  month_kwh: 2,
  week_kwh: [],
}
const fetchDevices = vi.fn(async () => [device])
// A member who sees days only (R4.3).
const refuse = () => {
  throw new ApiError(403, "no", { code: "detail_restricted" })
}
vi.mock("../server", () => ({
  fetchOverview: async () => ({
    live: null,
    today: { kwh: 3, typical_kwh: null },
  }),
  fetchSeries: async () => refuse(),
  fetchExpected: async () => refuse(),
  fetchActivity: async () => refuse(),
  fetchDevices: () => fetchDevices(),
  fetchDevice: async () => device,
}))

const { getActivity, getDashboard, getDevice, getDevices, getPower } =
  await import("../queries")

describe("getDevice", () => {
  it("reuses the request's device list read for the same bill", async () => {
    await getDevices(500_000)
    const d = await getDevice(device.id, 500_000)
    expect(fetchDevices).toHaveBeenCalledTimes(1)
    expect(d?.month_amount).toBe(500_000) // the whole bill on its one device
  })
})

describe("a member who sees days only", () => {
  it("gets today from the overview and no by-the-moment figures", async () => {
    const data = await getDashboard()
    expect(data?.byDay).toBe(true)
    expect(data?.days.map((d) => d.value)).toEqual([3])
    expect(await getPower()).toBeNull()
    expect(await getActivity()).toEqual([])
  })
})
