import { describe, expect, it } from "vitest"

import { roomSpending } from "../rooms"
import type { Device } from "../schemas"

const device = (id: string, room: string | null, month_amount: number) =>
  ({ id, name: id, room, month_amount }) as Device

describe("roomSpending", () => {
  it("is by device when no device has a room", () => {
    const got = roomSpending([
      device("Kettle", null, 5),
      device("Fridge", null, 9),
    ])
    expect(got.byRoom).toBe(false)
    expect(got.data.map((c) => c.label)).toEqual(["Fridge", "Kettle"])
  })

  it("groups devices that share a room and names a lone device by its room", () => {
    const got = roomSpending([
      device("Kettle", "Kitchen", 5),
      device("Oven", "Kitchen", 7),
      device("TV", "Living room", 3),
      device("Other", null, 20),
      device("Off", "Kitchen", 0),
    ])
    expect(got.byRoom).toBe(true)
    expect(got.data.map((c) => [c.label, c.value])).toEqual([
      ["Other", 20],
      ["Kitchen", 12],
      ["Living room", 3],
    ])
    expect(got.data[1]!.children!.map((c) => c.label)).toEqual([
      "Oven",
      "Kettle",
    ])
  })
})

describe("roomSpending with a lone device in a room", () => {
  it("stays by device: no room opens into devices", () => {
    const got = roomSpending([
      device("Kettle", "Kitchen", 5),
      device("Fridge", null, 9),
    ])
    expect(got.byRoom).toBe(false)
  })
})
