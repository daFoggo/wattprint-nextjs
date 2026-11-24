"use client"

import { useLocale, useTranslations } from "next-intl"

import { IconInfoCircle } from "@tabler/icons-react"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Popover } from "@workspace/ui/components/hairline/popover"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"

import { ModelBadge } from "@/components/shared/model-badge"
import { Tile } from "@/components/shared/tile"

import {
  bandPosition,
  changeSentence,
  forecastConfidence,
  tierPath,
} from "../forecast"

import { tierColor } from "../tier-color"

import type { CurrentBill, Forecast, PastBill } from "../schemas"

/**
 * The cycle's bill at its end (the pitch's forecast): from the home's expected-usage model, a middle figure with its
 * range and why it moved since yesterday; without a model, the weekday pattern. Then the tier it ends in, last month,
 * and when (and how likely) the next, dearer tier starts.
 */
export function BillForecast({
  bill,
  forecast: p,
  lastMonth,
  className,
}: {
  bill: CurrentBill
  /** Null before the home has a week of full days. */
  forecast: Forecast | null
  lastMonth?: PastBill
  className?: string
}) {
  const t = useTranslations("billing.forecast")
  const tb = useTranslations("billing")
  const locale = useLocale()
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
  const kwh = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const pct = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  })
  if (!p)
    return (
      <Tile title={t("title")} className={className}>
        <p className="text-sm text-muted-foreground">{t("unavailable")}</p>
      </Tile>
    )
  const change = lastMonth ? p.amount / lastMonth.amount - 1 : null
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    })
  const context = p.method === "context"
  const why = changeSentence(p)
  const path = tierPath(bill.tiers, bill.kwh, p.kwh)
  const end = date(Date.parse(`${bill.period_end}T12:00:00+07:00`))
  // Where the expected bill sits in its P10–P90 range, %.
  const at = bandPosition(p.amount, p.amount_p10, p.amount_p90)
  const vndSigned = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  })
  const delta = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  })
  // How it is made, its range, why it moved and how good it has been: one click away, behind the model's badge.
  const how = (
    <Popover
      label={t("howTitle")}
      width={320}
      align="end"
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ModelBadge kind="forecast" confidence={forecastConfidence(p)} />
          <IconInfoCircle
            aria-hidden
            className="size-4 text-muted-foreground"
          />
        </button>
      }
    >
      <div className="flex flex-col gap-4 p-1">
        <p className="text-sm font-medium">{t("howTitle")}</p>
        {context && p.amount_p90 > p.amount_p10 ? (
          <figure className="flex flex-col gap-1.5">
            <figcaption className="text-xs text-muted-foreground">
              {t("how.range")}
            </figcaption>
            {/* The P10–P90 band, the expected bill marked on it and named above its mark. */}
            <div aria-hidden className="relative h-9 text-xs tabular-nums">
              <span
                className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center font-medium"
                style={{ left: `${Math.min(80, Math.max(20, at))}%` }}
              >
                <span className="font-normal text-muted-foreground">
                  {t("how.mid")}
                </span>
                {vnd.format(p.amount)}
              </span>
            </div>
            <div
              aria-hidden
              className="relative h-2 rounded-full bg-primary/30"
            >
              <span
                className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-popover bg-primary"
                style={{ left: `${at}%` }}
              />
            </div>
            <div
              aria-hidden
              className="flex justify-between text-xs tabular-nums"
            >
              <span className="flex flex-col">
                {vnd.format(p.amount_p10)}
                <span className="text-muted-foreground">{t("how.low")}</span>
              </span>
              <span className="flex flex-col items-end">
                {vnd.format(p.amount_p90)}
                <span className="text-muted-foreground">{t("how.high")}</span>
              </span>
            </div>
            <p className="sr-only">
              {t("range", {
                low: vnd.format(p.amount_p10),
                high: vnd.format(p.amount_p90),
                kwhLow: kwh.format(p.kwh_p10),
                kwhHigh: kwh.format(p.kwh_p90),
              })}
            </p>
          </figure>
        ) : null}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-muted-foreground">{t("how.method")}</dt>
          <dd className="text-right">
            {t(context ? "how.context" : "how.weekday")}
          </dd>
          {why ? (
            <>
              <dt className="text-muted-foreground">{t("how.since")}</dt>
              <dd className="text-right tabular-nums">
                {t("how.sinceValue", {
                  amount: vndSigned.format(why.amount),
                  top: t(`parts.${why.top}`),
                })}
              </dd>
            </>
          ) : null}
          {p.accuracy ? (
            <>
              <dt className="text-muted-foreground">{t("how.checked")}</dt>
              <dd className="text-right tabular-nums">
                {p.accuracy.source === "cycle"
                  ? t("how.checkedCycle")
                  : t("how.checkedBacktest", { cycles: p.accuracy.cycles })}
              </dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">{t("how.basis")}</dt>
              <dd className="text-right tabular-nums">
                {t("how.basisValue", { days: p.basis_days })}
              </dd>
            </>
          )}
        </dl>
      </div>
    </Popover>
  )
  return (
    <Tile
      title={t("title")}
      description={t("until", { end })}
      action={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {p.simulated.includes("heater") ? (
            <Badge tone="warning" size="sm">
              {t("simulated")}
            </Badge>
          ) : null}
          {how}
        </div>
      }
      className={className}
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-3xl font-medium tracking-tight tabular-nums">
            {vnd.format(p.amount)}
          </p>
          {change !== null ? (
            <Tooltip
              content={t("vsLast", { amount: vnd.format(lastMonth!.amount) })}
            >
              <span
                tabIndex={0}
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {/* Under half a percent reads as no change (the formatter would print 0%). */}
                {Math.abs(change) < 0.005 ? (
                  <Badge size="sm">{t("sameAsLast")}</Badge>
                ) : (
                  <Badge tone={change > 0 ? "warning" : "success"} size="sm">
                    {delta.format(change)}
                  </Badge>
                )}
              </span>
            </Tooltip>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("headline", { kwh: kwh.format(p.kwh), tier: p.tier })}
        </p>
      </div>
      <figure className="flex flex-col gap-2">
        {/* Each tier its colour: solid to the kWh used, half to the kWh expected, faint beyond. */}
        <div role="img" aria-label={t("path")} className="relative h-3">
          {path.segments.map((x) => (
            <span
              key={x.tier_no}
              className="absolute inset-y-0 overflow-hidden rounded-full border-2 border-background"
              style={{
                left: `${x.left}%`,
                width: `${x.width}%`,
                color: tierColor(x.tier_no),
              }}
            >
              <span className="absolute inset-0 bg-current opacity-15" />
              <span
                className="absolute inset-y-0 left-0 bg-current opacity-50"
                style={{ width: `${x.expected}%` }}
              />
              <span
                className="absolute inset-y-0 left-0 bg-current"
                style={{ width: `${x.used}%` }}
              />
            </span>
          ))}
        </div>
        <div aria-hidden className="relative h-4 text-xs text-muted-foreground">
          {path.segments.map((x) => (
            <span
              key={x.tier_no}
              className="absolute pl-1"
              style={{ left: `${x.left}%`, width: `${x.width}%` }}
            >
              {/* A narrow tier (an early one on a long cycle) keeps its number, never a cut word. */}
              {x.width >= 15 ? tb("tier", { tier: x.tier_no }) : x.tier_no}
            </span>
          ))}
        </div>
        <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span>{t("used", { kwh: kwh.format(bill.kwh) })}</span>
          <span>{t("expected", { date: end, kwh: kwh.format(p.kwh) })}</span>
        </figcaption>
      </figure>
      {p.next ? (
        <Tooltip
          content={t("nextBody", {
            price: vnd.format(p.next.tier.price_per_kwh),
            kwh: kwh.format(p.next.tier.from_kwh),
          })}
        >
          <span
            tabIndex={0}
            className="self-start rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Badge tone="warning" size="sm" dot>
              {p.next.tier.probability !== null &&
              p.next.tier.probability < 0.95 // near certain: say it plainly
                ? t("nextShortLikely", {
                    pct: pct.format(p.next.tier.probability),
                    tier: p.next.tier.tier_no,
                    date: date(p.next.at),
                  })
                : t("nextShort", {
                    tier: p.next.tier.tier_no,
                    date: date(p.next.at),
                  })}
            </Badge>
          </span>
        </Tooltip>
      ) : null}
    </Tile>
  )
}
