import { useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Badge } from "@workspace/ui/components/hairline/badge"
import { NumberRoll } from "@workspace/ui/components/hairline/number-roll"
import { Progress } from "@workspace/ui/components/hairline/progress"

import { PillLink } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { PLAN_PATH } from "@/config/routes"

import { cycleDay } from "../forecast"
import type { CurrentBill, Forecast, PastBill } from "../schemas"

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
  forecast: p,
  now,
  lastMonth,
  className,
}: {
  bill: CurrentBill
  /** Null before the home has a week of full days. */
  forecast: Forecast | null
  now: number
  lastMonth?: PastBill
  className?: string
}) {
  const t = useTranslations("billing")
  const locale = useLocale()
  const vnd = new Intl.NumberFormat(locale, VND)
  const kwh = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    })
  const change = lastMonth && p ? p.amount / lastMonth.amount - 1 : null
  const cycle = cycleDay(bill.period_start, bill.period_end, now)
  // The forecast is the figure to act on: the hero, with its range and the cycle's progress. Without one, the bill
  // so far takes its place and the row keeps the rest.
  const hero = p
    ? {
        label: t("overview.forecast"),
        value: p.amount,
        note:
          p.method === "context"
            ? t("overview.forecastRange", {
                low: vnd.format(p.amount_p10),
                high: vnd.format(p.amount_p90),
              })
            : t("overview.forecastNote", {
                kwh: kwh.format(Math.round(p.kwh)),
                tier: p.tier,
              }),
      }
    : {
        label: t("overview.soFar"),
        value: bill.amount_total,
        note: t("overview.kwh", { kwh: kwh.format(bill.kwh) }),
      }
  const stats = [
    ...(p
      ? [
          {
            label: t("overview.soFar"),
            value: bill.amount_total,
            note: t("overview.kwh", { kwh: kwh.format(bill.kwh) }),
          },
        ]
      : []),
    {
      label: t("overview.today"),
      value: bill.today_amount,
      note: t("overview.kwh", { kwh: kwh.format(bill.today_kwh) }),
    },
  ]
  return (
    <Tile
      title={t("overview.title", {
        start: date(dayStart(bill.period_start)),
        end: date(dayStart(bill.period_end)),
      })}
      description={t("overview.description")}
      className={className}
    >
      {bill.status === "partial" || bill.tariff_straddle ? (
        // Why a figure may be off, in words, not a bare warning chip.
        <Alert
          tone="warning"
          title={t(
            bill.status === "partial" && bill.tariff_straddle
              ? "overview.partialStraddle"
              : bill.status === "partial"
                ? "overview.partial"
                : "overview.straddle"
          )}
        >
          {[
            bill.status === "partial" ? t("overview.partialBody") : null,
            bill.tariff_straddle ? t("overview.straddleBody") : null,
          ]
            .filter(Boolean)
            .join(" ")}
        </Alert>
      ) : null}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{hero.label}</span>
          <span className="text-4xl font-medium tracking-tight tabular-nums">
            <NumberRoll value={hero.value} format={VND} locales={locale} />
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {hero.note}
          </span>
        </div>
        <Progress
          value={(cycle.day / cycle.total) * 100}
          label={t("overview.cycleDay", cycle)}
          showValue={false}
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="flex min-w-0 flex-col gap-1">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className="flex flex-col gap-0.5">
              <span className="text-xl font-medium tabular-nums">
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
              <span className="flex items-center gap-2 text-xl font-medium tabular-nums">
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
      {p?.next ? (
        <Alert
          tone="warning"
          action={
            <PillLink href={PLAN_PATH}>
              {t("forecast.planLink", { tier: p.next.tier.tier_no })}
            </PillLink>
          }
          title={
            p.next.tier.probability !== null
              ? t("forecast.nextLikely", {
                  pct: new Intl.NumberFormat(locale, {
                    style: "percent",
                    maximumFractionDigits: 0,
                  }).format(p.next.tier.probability),
                  tier: p.next.tier.tier_no,
                  date: date(p.next.at),
                })
              : t("forecast.nextTitle", {
                  tier: p.next.tier.tier_no,
                  date: date(p.next.at),
                })
          }
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
