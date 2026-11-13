"use client"

import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"
import {
  DataTable,
  type DataTableColumn,
} from "@workspace/ui/components/hairline/data-table"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { Sparkline } from "@workspace/ui/components/hairline/sparkline"

import { DEVICES_PATH } from "@/config/routes"
import { useRouter } from "@/i18n/navigation"

import type { Device } from "../schemas"
import { DeviceIcon } from "@/components/shared/device-icon"

const VND = { style: "currency", currency: "VND" } as const

/**
 * Every device (Sense's device list): its last 7 days next to its name, whether it is on, what it draws now, today
 * and this month's cost. A row (click, or Enter) opens the device's page.
 */
export function DeviceList({
  devices,
  className,
}: {
  devices: Device[]
  className?: string
}) {
  const t = useTranslations("energy")
  const locale = useLocale()
  const router = useRouter()
  const columns: DataTableColumn<Device>[] = [
    {
      key: "name",
      header: t("deviceList.colDevice"),
      // The longest name ("Máy nướng bánh mì") fits at the minimum; what the row has spare is shared by every
      // column but the chart, so the figures do not bunch up at the right edge.
      width: "minmax(200px,1.6fr)",
      sortable: true,
      card: "title",
      cell: (d) => (
        <span className="flex min-w-0 items-center gap-3">
          <DeviceIcon type={d.type} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{d.name}</span>
            {d.room ? (
              <span className="truncate text-xs text-muted-foreground">
                {d.room}
              </span>
            ) : null}
          </span>
        </span>
      ),
    },
    {
      key: "week_kwh",
      header: t("last7Days"),
      width: "200px",
      card: "hidden",
      value: (d) => d.week_kwh.reduce((s, v) => s + v, 0),
      // A fixed width: the cell shrinks to its content, so a percentage has nothing to measure against. The
      // margin keeps the line's end dot inside the cell, which clips its overflow.
      cell: (d) => (
        <Sparkline
          className="mx-1.5"
          data={d.week_kwh}
          width={160}
          height={28}
          color="primary"
          variant="area"
          showScrubber
          format={{ maximumFractionDigits: 2 }}
          suffix=" kWh"
          label={t("deviceList.weekLabel", { device: d.name })}
        />
      ),
    },
    {
      key: "on",
      header: t("deviceList.colStatus"),
      // At least "Trạng thái" and its sort arrow.
      width: "minmax(104px,1fr)",
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
      width: "minmax(80px,0.8fr)",
      align: "right",
      sortable: true,
      card: "trailing",
      cell: (d) => <NumberRoll value={d.watts} suffix=" W" locales={locale} />,
    },
    {
      key: "today_kwh",
      header: t("today"),
      width: "minmax(90px,0.8fr)",
      align: "right",
      sortable: true,
      card: "hidden",
      cell: (d) => (
        <NumberRoll
          value={d.today_kwh}
          format={{ maximumFractionDigits: 1 }}
          suffix=" kWh"
          locales={locale}
        />
      ),
    },
    {
      key: "month_amount",
      header: t("deviceList.colMonth"),
      width: "minmax(116px,1fr)",
      align: "right",
      sortable: true,
      card: "hidden",
      cell: (d) => (
        <NumberRoll value={d.month_amount} format={VND} locales={locale} />
      ),
    },
  ]
  return (
    <DataTable
      className={className}
      label={t("deviceList.label")}
      searchable
      searchPlaceholder={t("deviceList.search")}
      columns={columns}
      rows={devices}
      noun={[t("deviceList.nounOne"), t("deviceList.nounOther")]}
      defaultSort={{ key: "month_amount", dir: "desc" }}
      pageSize={10}
      onRowClick={(d) =>
        router.push(`${DEVICES_PATH}/${encodeURIComponent(d.id)}`)
      }
    />
  )
}
