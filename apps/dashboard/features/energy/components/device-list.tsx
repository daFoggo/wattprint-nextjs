"use client"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/hairline/data-table"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { toast } from "@workspace/ui/components/hairline/toast-stack"

import { DEMO_DEVICES, type DemoDevice } from "../demo"

const COLUMNS: DataTableColumn<DemoDevice>[] = [
  {
    key: "name",
    header: "Device",
    width: "minmax(0,1.6fr)",
    sortable: true,
    card: "title",
    cell: (d) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{d.name}</span>
        <span className="truncate text-xs text-muted-foreground">{d.room}</span>
      </span>
    ),
  },
  {
    key: "on",
    header: "Status",
    width: "90px",
    sortable: true,
    card: "subtitle",
    value: (d) => (d.on ? 1 : 0),
    cell: (d) => (
      <Badge tone={d.on ? "success" : "neutral"} size="sm" dot>
        {d.on ? "On" : "Off"}
      </Badge>
    ),
  },
  {
    key: "watts",
    header: "Now",
    width: "90px",
    align: "right",
    sortable: true,
    card: "trailing",
    cell: (d) => <NumberRoll value={d.watts} suffix=" W" locales="en-US" />,
  },
  {
    key: "todayKwh",
    header: "Today",
    width: "100px",
    align: "right",
    sortable: true,
    card: "hidden",
    cell: (d) => (
      <NumberRoll
        value={d.todayKwh}
        format={{ maximumFractionDigits: 1 }}
        suffix=" kWh"
        locales="en-US"
      />
    ),
  },
]

/** Every device and whether it is on, busiest first; a row opens into its detail. Sample until NILM runs. */
export function DeviceList({ className }: { className?: string }) {
  return (
    <DataTable
      className={className}
      label="Devices, sample data"
      searchPlaceholder="Search devices · sample data"
      columns={COLUMNS}
      rows={DEMO_DEVICES}
      noun={["device", "devices"]}
      defaultSort={{ key: "watts", dir: "desc" }}
      pageSize={5}
      renderDetail={(d) => (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{d.note}</p>
          <Button
            size="sm"
            variant="outline"
            // shortcut: no device page yet; link it once /devices/[id] exists.
            onClick={() => toast(`${d.name}: device pages are coming soon`)}
          >
            View details
          </Button>
        </div>
      )}
    />
  )
}
