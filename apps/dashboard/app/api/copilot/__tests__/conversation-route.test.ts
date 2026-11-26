import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/errors"

vi.mock("server-only", () => ({}))
vi.mock("next/server", () => ({ connection: async () => {} }))
vi.mock("@/lib/dal", () => ({
  requirePermission: vi.fn(async () => ({ accessToken: "token" })),
}))
const deleteConversation = vi.fn()
vi.mock("@/features/copilot/server", () => ({
  deleteConversation: (...a: unknown[]) => deleteConversation(...a),
}))

const { DELETE } = await import("../conversations/[id]/route")

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
const call = (id: string) =>
  DELETE(new Request("http://x", { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  })

describe("DELETE /api/copilot/conversations/[id]", () => {
  beforeEach(() => {
    deleteConversation.mockReset()
  })

  it("deletes the caller's chat with the session's token", async () => {
    const res = await call(ID)
    expect(res.status).toBe(204)
    expect(deleteConversation).toHaveBeenCalledWith("token", ID)
  })

  it("refuses an id that is not a UUID without calling the backend", async () => {
    const res = await call("../users/me")
    expect(res.status).toBe(422)
    expect(deleteConversation).not.toHaveBeenCalled()
  })

  it("passes the backend's refusal on (a chat that is not the caller's is a 404)", async () => {
    deleteConversation.mockRejectedValue(
      new ApiError(404, "Not found", { code: "not_found", detail: "No such conversation" })
    )
    const res = await call(ID)
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ code: "not_found", detail: "No such conversation" })
  })
})
