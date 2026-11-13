import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Badge } from "@workspace/ui/components/hairline/badge"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"

import { Tile } from "@/components/shared/tile"

import { projectBill } from "../forecast"
import type { CurrentBill, PastBill } from "../schemas"

const DAY = 86_400_000
const VND = {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
} as const

// Backend dates are calendar days in Vietnam.
const dayStart = (date: string) => Date.parse(`${date}T00:00:00+07:00`)

/**
 * The bill page's head: the cycle so far and today, where it ends at this pace and against last month, then when
 * the next, dearer tier starts. Each figure has its kWh under it.
 */
export function BillOverview({
  bill,
  now,
  lastMonth,
  className,
}: {
  bill: CurrentBill
  now: number
  lastMonth?: PastBill
  className?: string
}) {
  const t = useTranslations("billing")
  const locale = useLocale()
  const p = projectBill(bill, now)
  const vnd = new Intl.NumberFormat(locale, VND)
  const kwh = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    })
  const end = dayStart(bill.period_end) + DAY
  const daysLeft = Math.max(0, Math.round((end - now) / DAY))
  const change = lastMonth ? p.amount / lastMonth.amount - 1 : null
  const stats = [
    {
      label: t("overview.soFar"),
      value: bill.amount_total,
      note: t("overview.kwh", { kwh: kwh.format(bill.kwh) }),
    },
    {
      label: t("overview.today"),
      value: bill.today_amount,
      note: t("overview.kwh", { kwh: kwh.format(bill.today_kwh) }),
    },
    {
      label: t("overview.forecast"),
      value: p.amount,
      note: t("overview.forecastNote", {
        kwh: kwh.format(Math.round(p.kwh)),
        tier: p.tier,
      }),
    },
  ]
  return (
    <Tile
      title={t("overview.title", {
        start: date(dayStart(bill.period_start)),
        end: date(dayStart(bill.period_end)),
      })}
      description={t("overview.description", { days: daysLeft })}
      className={className}
      action={
        bill.status === "partial" || bill.tariff_straddle ? (
          <div className="flex flex-wrap gap-1.5">
            {bill.status === "partial" && (
              <Badge tone="warning" size="sm">
                {t("overview.partial")}
              </Badge>
            )}
            {bill.tariff_straddle && (
              // The backend prices the whole cycle at the tariff valid on its first day.
              <Badge tone="warning" size="sm">
                {t("overview.straddle")}
              </Badge>
            )}
          </div>
        ) : null
      }
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="flex flex-col gap-0.5">
              <span className="text-2xl font-medium tabular-nums">
                <NumberRoll value={s.value} format={VND} locales={locale} />
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {s.note}
              </span>
            </dd>
          </div>
        ))}
        {change !== null ? (
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-muted-foreground">
              {t("overview.change")}
            </dt>
            <dd className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-2xl font-medium tabular-nums">
                {new Intl.NumberFormat(locale, {
                  style: "percent",
                  maximumFractionDigits: 0,
                  signDisplay: "exceptZero",
                }).format(change)}
                <Badge tone={change > 0 ? "warning" : "success"} size="sm">
                  {t(change > 0 ? "overview.more" : "overview.less")}
                </Badge>
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("overview.lastMonth", {
                  amount: vnd.format(lastMonth!.amount),
                })}
              </span>
            </dd>
          </div>
        ) : null}
      </dl>
      {p.next ? (
        <Alert
          tone="warning"
          title={t("forecast.nextTitle", {
            tier: p.next.tier.tier_no,
            date: date(p.next.at),
          })}
        >
          {t("forecast.nextBody", {
            price: vnd.format(p.next.tier.price_per_kwh),
            kwh: kwh.format(p.next.tier.from_kwh),
          })}
        </Alert>
      ) : null}
    </Tile>
  )
}
