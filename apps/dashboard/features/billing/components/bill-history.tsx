import { useLocale, useTranslations } from "next-intl"

import { RevenueChart } from "@workspace/ui/components/hairline/revenue-chart"

import type { PastBill } from "../schemas"

const monthName = (month: number, locale: string) =>
  new Date(Date.UTC(2026, month - 1, 15)).toLocaleDateString(locale, {
    month: "long",
    timeZone: "UTC",
  })

/** Month by month, this year against last year, in VND or kWh (the comparison between months). */
export function BillHistory({
  bills,
  className,
}: {
  bills: PastBill[]
  className?: string
}) {
  const t = useTranslations("billing.history")
  const locale = useLocale()
  const year = Math.max(...bills.map((b) => Number(b.month.slice(0, 4))))
  const of = (y: number) => bills.filter((b) => b.month.startsWith(`${y}-`))
  const [now, before] = [of(year), of(year - 1)]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  return (
    <RevenueChart
      className={className}
      // Numbers under the plot ("Tháng 12" did not fit twelve times); the readout names the month.
      labels={months.map(String)}
      titles={months.map((m) => monthName(m, locale))}
      series={[t("thisYear"), t("lastYear")]}
      metrics={[
        {
          id: "amount",
          label: t("amount"),
          current: now.map((b) => b.amount),
          previous: before.map((b) => b.amount),
          format: {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
          },
        },
        {
          id: "kwh",
          label: t("kwh"),
          current: now.map((b) => b.kwh),
          previous: before.map((b) => b.kwh),
          format: { maximumFractionDigits: 0 },
        },
      ]}
      locales={locale}
    />
  )
}
