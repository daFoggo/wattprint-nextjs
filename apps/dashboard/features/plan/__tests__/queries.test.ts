import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const fetchPlan = vi.fn()
const fetchBasis = vi.fn()
const fetchHistory = vi.fn()
const fetchPlanById = vi.fn()
vi.mock("../server", () => ({
  fetchPlanById: (...a: unknown[]) => fetchPlanById(...a),
  fetchPlan: (...a: unknown[]) => fetchPlan(...a),
  fetchBasis: (...a: unknown[]) => fetchBasis(...a),
  fetchHistory: (...a: unknown[]) => fetchHistory(...a),
}))

const queries = await import("../queries")
const load = async () => queries

describe("getPlan", () => {
  it("is null when there is no running plan (404)", async () => {
    fetchPlan.mockImplementation(async () => {
      throw new ApiError(404, "none")
    })
    expect(await (await load()).getPlan()).toBeNull()
  })
  it("throws on a server error", async () => {
    fetchPlan.mockImplementation(async () => {
      throw new ApiError(500, "down")
    })
    await expect((await load()).getPlan()).rejects.toThrow()
  })
})

describe("getPlanBasis", () => {
  it("is null without a tariff (404) or before a forecast (422)", async () => {
    fetchBasis.mockImplementation(async () => {
      throw new ApiError(404, "no tariff")
    })
    expect(await (await load()).getPlanBasis()).toBeNull()
    fetchBasis.mockImplementation(async () => {
      throw new ApiError(422, "no forecast")
    })
    expect(await (await load()).getPlanBasis()).toBeNull()
  })
  it("throws on a server error", async () => {
    fetchBasis.mockImplementation(async () => {
      throw new ApiError(500, "down")
    })
    await expect((await load()).getPlanBasis()).rejects.toThrow()
  })
})

describe("getPlanHistory", () => {
  it("is null without a home (404)", async () => {
    fetchHistory.mockImplementation(async () => {
      throw new ApiError(404, "no home")
    })
    expect(await (await load()).getPlanHistory()).toBeNull()
  })
  it("throws on a server error", async () => {
    fetchHistory.mockImplementation(async () => {
      throw new ApiError(500, "down")
    })
    await expect((await load()).getPlanHistory()).rejects.toThrow()
  })
})

describe("getPlanById", () => {
  it("is null when the plan is not the user's to open (404) or the id is malformed (422)", async () => {
    fetchPlanById.mockImplementation(async () => {
      throw new ApiError(404, "not found")
    })
    expect(await (await load()).getPlanById("a")).toBeNull()
    fetchPlanById.mockImplementation(async () => {
      throw new ApiError(422, "bad id")
    })
    expect(await (await load()).getPlanById("b")).toBeNull()
  })
  it("passes the id and throws on a server error", async () => {
    fetchPlanById.mockImplementation(async () => {
      throw new ApiError(500, "down")
    })
    await expect((await load()).getPlanById("c")).rejects.toThrow()
    expect(fetchPlanById).toHaveBeenLastCalledWith("token", "c")
  })
})
