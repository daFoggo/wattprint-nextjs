import { useLocale, useTranslations } from "next-intl"

import { ComboChart } from "@workspace/ui/components/hairline/combo-chart"

import { dayLabel } from "../days"
import type { DeviceDetail } from "../schemas"

/** A device's energy each day this month, with its 3-day average (the prototype's device chart). */
export function DeviceDays({
  device,
  className,
}: {
  device: DeviceDetail
  className?: string
}) {
  const t = useTranslations("energy.deviceDays")
  const locale = useLocale()
  // The API sends at least 30 days (for alert thresholds); this chart is the month's.
  const month = device.days.at(-1)?.date.slice(0, 7) ?? ""
  const days = device.days.filter((d) => d.date.startsWith(month))
  return (
    <ComboChart
      className={className}
      title={t("title")}
      unit="kWh"
      series={[t("daily"), t("average")]}
      rolling={3}
      days={days.map((d) => ({
        key: d.date,
        label: dayLabel(d.date, locale, { month: "numeric", day: "numeric" }),
        title: dayLabel(d.date, locale, {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        value: d.kwh,
      }))}
      format={{ maximumFractionDigits: 2 }}
      locales={locale}
    />
  )
}
