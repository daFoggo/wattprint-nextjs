import { describe, expect, it } from "vitest"

import { DeviceApiSchema } from "../schemas"

const DEVICE = {
  id: "d1",
  name: "Kettle",
  room: null,
  type: "kettle",
  on: false,
  watts: 0,
  today_kwh: 0.2,
  month_kwh: 4,
  week_kwh: [0, 0, 0, 0, 0, 0, 0.2],
}

describe("DeviceApiSchema estimate", () => {
  it("keeps the level of trust in the device's share", () => {
    const d = DeviceApiSchema.parse({
      ...DEVICE,
      estimate: { level: "high" },
    })
    expect(d.estimate).toEqual({ level: "high" })
  })

  it("is null for an unscored device or an older backend", () => {
    expect(
      DeviceApiSchema.parse({ ...DEVICE, estimate: null }).estimate
    ).toBeNull()
    expect(DeviceApiSchema.parse(DEVICE).estimate).toBeNull()
  })
})
