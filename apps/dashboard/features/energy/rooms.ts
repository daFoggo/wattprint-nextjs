import type { SpendCategory } from "@workspace/ui/components/hairline/spending-ring"

import type { Device } from "./schemas"

/**
 * This month's cost by room: devices that share a room become one category opening into them, a room with one
 * device is named by its room, a device with no room stands alone. `byRoom` is false when no room opens into
 * devices, so the tile speaks of devices and every category is named by its device.
 */
export function roomSpending(devices: Device[]): {
  data: SpendCategory[]
  byRoom: boolean
} {
  const rooms = new Map<string, Device[]>()
  for (const d of devices) {
    if (d.month_amount <= 0) continue
    rooms.set(d.room ?? d.id, [...(rooms.get(d.room ?? d.id) ?? []), d])
  }
  const byRoom = [...rooms.values()].some((list) => list.length > 1)
  const data: SpendCategory[] = [...rooms.entries()]
    .map(([room, list]) =>
      list.length === 1
        ? {
            id: list[0]!.id,
            label: (byRoom ? list[0]!.room : null) ?? list[0]!.name,
            value: list[0]!.month_amount,
          }
        : {
            id: room,
            label: room,
            value: list.reduce((s, d) => s + d.month_amount, 0),
            children: list
              .map((d) => ({ id: d.id, label: d.name, value: d.month_amount }))
              .sort((a, b) => b.value - a.value),
          }
    )
    .sort((a, b) => b.value - a.value)
  return { data, byRoom }
}
