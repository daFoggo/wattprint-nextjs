import { useLocale, useTranslations } from "next-intl"

import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { cn } from "@workspace/ui/lib/utils"

import type { DeviceDetail } from "../schemas"

const VND = { style: "currency", currency: "VND" } as const

/** A device's figures as one `dl` row (design system: metrics are a row, no stat cards). */
export function DeviceStats({
  device,
  className,
}: {
  device: DeviceDetail
  className?: string
}) {
  const t = useTranslations("energy.deviceStats")
  const locale = useLocale()
  const stats = [
    {
      label: t("avgOn"),
      value: (
        <NumberRoll value={device.avg_on_w} suffix=" W" locales={locale} />
      ),
    },
    {
      label: t("peak"),
      value: <NumberRoll value={device.peak_w} suffix=" W" locales={locale} />,
    },
    {
      label: t("month"),
      value: (
        <NumberRoll
          value={device.month_kwh}
          format={{ maximumFractionDigits: 1 }}
          suffix=" kWh"
          locales={locale}
        />
      ),
    },
    {
      label: t("monthAmount"),
      value: (
        <NumberRoll value={device.month_amount} format={VND} locales={locale} />
      ),
    },
    {
      label: t("year"),
      value: (
        <NumberRoll
          value={device.year_amount}
          format={{ ...VND, maximumFractionDigits: 0 }}
          locales={locale}
        />
      ),
    },
    {
      label: t("share"),
      value: (
        <NumberRoll
          value={device.home_share}
          format={{ style: "percent", maximumFractionDigits: 0 }}
          locales={locale}
        />
      ),
    },
  ]
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-5 rounded-3xl border bg-background p-4 md:grid-cols-3 md:p-5 xl:grid-cols-6",
        className
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col-reverse gap-1">
          <dt className="text-sm text-muted-foreground">{s.label}</dt>
          <dd className="text-2xl font-medium tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}
