import { useLocale, useTranslations } from "next-intl"

import { RevenueChart } from "@workspace/ui/components/hairline/revenue-chart"

import type { PastBill } from "../schemas"

const monthTitle = (month: string, locale: string) =>
  new Date(`${month}-15T00:00:00Z`).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

/** The same month a year before ("2026-09" -> "2025-09"). */
const yearBefore = (month: string) =>
  `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`

/**
 * The last 12 cycles in VND or kWh, each against the same month a year before when every one of them has one. The
 * axis holds only months with a bill: a home's history starts the month its meter did.
 */
export function BillHistory({
  bills,
  className,
}: {
  /** Oldest first. */
  bills: PastBill[]
  className?: string
}) {
  const t = useTranslations("billing.history")
  const locale = useLocale()
  const shown = bills.slice(-12)
  const byMonth = new Map(bills.map((b) => [b.month, b]))
  const before = shown.map((b) => byMonth.get(yearBefore(b.month)))
  const previous = before.every((b) => b !== undefined) ? before : undefined
  return (
    <RevenueChart
      className={className}
      // Month numbers under the plot ("Tháng 12" did not fit twelve times); the readout names the month.
      labels={shown.map((b) => String(Number(b.month.slice(5))))}
      titles={shown.map((b) => monthTitle(b.month, locale))}
      series={[t("thisYear"), t("lastYear")]}
      metrics={[
        {
          id: "amount",
          label: t("amount"),
          current: shown.map((b) => b.amount),
          previous: previous?.map((b) => b.amount),
          format: {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0,
          },
        },
        {
          id: "kwh",
          label: t("kwh"),
          current: shown.map((b) => b.kwh),
          previous: previous?.map((b) => b.kwh),
          format: { maximumFractionDigits: 0 },
        },
      ]}
      locales={locale}
    />
  )
}
