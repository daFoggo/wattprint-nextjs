"use client"

import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Button } from "@workspace/ui/components/hairline/button"
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/hairline/data-table"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { toast } from "@workspace/ui/components/hairline/toast-stack"

import { DEMO_DEVICES } from "../demo"

type Row = {
  id: string
  name: string
  room: string
  on: boolean
  watts: number
  todayKwh: number
  note: string
}

/** Every device and whether it is on, busiest first; a row opens into its detail. Sample until NILM runs. */
export function DeviceList({ className }: { className?: string }) {
  const t = useTranslations("energy")
  const locale = useLocale()
  const rows: Row[] = DEMO_DEVICES.map((d) => ({
    ...d,
    name: t(`demo.devices.${d.id}`),
    room: t(`demo.rooms.${d.room}`),
    note: t(`demo.notes.${d.id}`),
  }))
  const columns: DataTableColumn<Row>[] = [
    {
      key: "name",
      header: t("deviceList.colDevice"),
      width: "minmax(0,1.6fr)",
      sortable: true,
      card: "title",
      cell: (d) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{d.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {d.room}
          </span>
        </span>
      ),
    },
    {
      key: "on",
      header: t("deviceList.colStatus"),
      // Fits "Trạng thái" and its sort arrow.
      width: "110px",
      sortable: true,
      card: "subtitle",
      value: (d) => (d.on ? 1 : 0),
      cell: (d) => (
        <Badge tone={d.on ? "success" : "neutral"} size="sm" dot>
          {d.on ? t("deviceList.on") : t("deviceList.off")}
        </Badge>
      ),
    },
    {
      key: "watts",
      header: t("deviceList.colNow"),
      width: "90px",
      align: "right",
      sortable: true,
      card: "trailing",
      cell: (d) => <NumberRoll value={d.watts} suffix=" W" locales={locale} />,
    },
    {
      key: "todayKwh",
      header: t("today"),
      width: "100px",
      align: "right",
      sortable: true,
      card: "hidden",
      cell: (d) => (
        <NumberRoll
          value={d.todayKwh}
          format={{ maximumFractionDigits: 1 }}
          suffix=" kWh"
          locales={locale}
        />
      ),
    },
  ]
  return (
    <DataTable
      className={className}
      label={t("deviceList.label")}
      searchPlaceholder={t("deviceList.search")}
      columns={columns}
      rows={rows}
      noun={[t("deviceList.nounOne"), t("deviceList.nounOther")]}
      defaultSort={{ key: "watts", dir: "desc" }}
      pageSize={5}
      renderDetail={(d) => (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{d.note}</p>
          <Button
            size="sm"
            variant="outline"
            // shortcut: no device page yet; link it once /devices/[id] exists.
            onClick={() =>
              toast(t("deviceList.comingSoon", { device: d.name }))
            }
          >
            {t("deviceList.viewDetails")}
          </Button>
        </div>
      )}
    />
  )
}
