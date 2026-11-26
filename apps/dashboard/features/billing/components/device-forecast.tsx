import { useLocale, useTranslations } from "next-intl"

import { IconBulb } from "@tabler/icons-react"

import { Badge, type BadgeTone } from "@workspace/ui/components/hairline/badge"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { Tile } from "@/components/shared/tile"
import { Link } from "@/i18n/navigation"
import { PLAN_PATH } from "@/config/routes"

import {
  band,
  barWidth,
  evidenceDir,
  trackMax,
  versusUsual,
  weekTotals,
} from "../device-forecast"
import type { DeviceForecast } from "../schemas"

const TONE: Record<DeviceForecast["confidence"], BadgeTone> = {
  high: "success",
  medium: "warning",
  low: "neutral",
}

function formats(locale: string) {
  return {
    vnd: new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }),
    kwh: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    // A day's share of a small device is a few hundredths of a kWh.
    kwhDay: new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }),
    day: new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }),
    date: new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  }
}

const at = (iso: string) => new Date(`${iso}T00:00:00+07:00`)

/** The plan page with this advice picked. */
const planHref = (device: string, key: string) => ({
  pathname: PLAN_PATH,
  query: { add: `${device}.${key}` },
})

/** How certain: the badge alone (the measured error stays behind it, for Wappi). */
function Certainty({ d }: { d: DeviceForecast }) {
  const t = useTranslations("billing.deviceForecast")
  return (
    <Badge tone={TONE[d.confidence]} size="sm" dot>
      {t(`confidence.${d.confidence}`)}
    </Badge>
  )
}

/**
 * One device's next 7 days: the week in kWh and VND against its usual, each day's P10–P90 band with its middle, why it
 * differs from its usual (factors with their evidence on a two-sided track, adding up to the change), the cycle's rest
 * and priced advice. Every figure comes from the backend.
 */
export function DeviceForecastTile({
  device: d,
  periodEnd,
  className,
}: {
  device: DeviceForecast
  periodEnd: string
  className?: string
}) {
  const t = useTranslations("billing.deviceForecast")
  const f = formats(useLocale())
  const max = trackMax(d.next_days)
  const week = weekTotals(d.next_days)
  const e = d.explain
  // A change against the usual is told when it can be trusted: the weekday mean's always, the model's when it fits.
  const vs =
    e && (d.method === "weekday" || e.explainable) ? versusUsual(e) : null
  return (
    <Tile
      title={t("title")}
      description={vs ? t("versus", vs) : undefined}
      action={<Certainty d={d} />}
      className={className}
    >
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium tabular-nums">
          {t("week", {
            kwh: f.kwh.format(week.kwh),
            amount: f.vnd.format(week.amount),
          })}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("toEnd", {
            end: f.date.format(at(periodEnd)),
            amount: f.vnd.format(d.amount),
            kwh: f.kwh.format(d.kwh),
          })}
          {d.kwh_p10 !== null && d.kwh_p90 !== null
            ? ` · ${t("range", { low: f.kwh.format(d.kwh_p10), high: f.kwh.format(d.kwh_p90) })}`
            : null}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {d.next_days.map((day) => {
          const b = band(day, max)
          const label = f.day.format(at(day.date))
          return (
            <li
              key={day.date}
              className="grid grid-cols-4 items-center gap-3 text-xs sm:grid-cols-6"
            >
              <span className="text-muted-foreground">{label}</span>
              <span
                aria-hidden
                className="relative col-span-2 h-2 rounded-full bg-muted sm:col-span-4"
              >
                {b ? (
                  <>
                    <span
                      className="absolute inset-y-0 rounded-full bg-primary/30"
                      style={{
                        left: `${b.low}%`,
                        width: `${Math.max(1, b.high - b.low)}%`,
                      }}
                    />
                    <span
                      className="absolute inset-y-0 w-1 rounded-full bg-primary"
                      style={{ left: `calc(${b.mid}% - 2px)` }}
                    />
                  </>
                ) : null}
              </span>
              <span className="text-right tabular-nums">
                {day.kwh === null ? (
                  "–"
                ) : (
                  <>
                    <span className="sr-only">
                      {day.kwh_p10 !== null && day.kwh_p90 !== null
                        ? t("day", {
                            date: label,
                            kwh: f.kwh.format(day.kwh),
                            amount: f.vnd.format(day.amount ?? 0),
                            low: f.kwh.format(day.kwh_p10),
                            high: f.kwh.format(day.kwh_p90),
                          })
                        : t("dayNoRange", {
                            date: label,
                            kwh: f.kwh.format(day.kwh),
                            amount: f.vnd.format(day.amount ?? 0),
                          })}
                    </span>
                    <span aria-hidden>
                      {f.kwh.format(day.kwh)} kWh
                      {/* The week's VND heads the tile: on a phone a day keeps its kWh only. */}
                      <span className="hidden sm:inline">
                        {" "}
                        · {f.vnd.format(day.amount ?? 0)}
                      </span>
                    </span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      <p
        aria-hidden
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-1 rounded-full bg-primary" />
          {t("keyMid")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-full bg-primary/30" />
          {t("keyBand")}
        </span>
      </p>
      {e ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-medium">
              {t("why", { dir: vs?.dir ?? "same" })}
            </h3>
            {d.method === "model" && e.explainable ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {t("usualLine", {
                  usual: f.kwhDay.format(e.usual_kwh_day),
                  forecast: f.kwhDay.format(e.forecast_kwh_day),
                })}
              </p>
            ) : null}
          </div>
          {d.method === "model" && !e.explainable ? (
            <p className="text-xs text-muted-foreground">{t("unfit")}</p>
          ) : d.method === "weekday" ? (
            <p className="text-xs text-muted-foreground">
              {t("routineLine", { usual: f.kwhDay.format(e.usual_kwh_day) })}
              {e.busiest?.kwh != null
                ? ` ${t("busiest", {
                    date: f.day.format(at(e.busiest.date)),
                    kwh: f.kwhDay.format(e.busiest.kwh),
                  })}.`
                : null}
            </p>
          ) : e.factors.length ? (
            <ul className="flex flex-col gap-3">
              {e.factors.map((x) => {
                const width = barWidth(x, e.factors)
                const up = x.kwh_day >= 0
                return (
                  <li key={x.key} className="flex flex-col gap-1.5 text-xs">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span>
                        {t(`factor.${x.key}`, {
                          dir: evidenceDir(x),
                          now: x.now ?? 0,
                          before: x.before ?? 0,
                        })}
                        {x.recent_temp !== null && x.usual_temp !== null
                          ? ` ${t("trendCause", {
                              dir: x.recent_temp < x.usual_temp ? "down" : "up",
                              recent: x.recent_temp,
                              usual: x.usual_temp,
                            })}`
                          : null}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {t("effect", {
                          kwh: `${up ? "+" : "−"}${f.kwhDay.format(Math.abs(x.kwh_day))}`,
                          amount: `${up ? "+" : "−"}${f.vnd.format(Math.abs(x.amount))}`,
                        })}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="relative h-1.5 rounded-full bg-muted"
                    >
                      <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                      <span
                        className={`absolute inset-y-0 rounded-full ${up ? "bg-primary" : "bg-muted-foreground"}`}
                        style={
                          up
                            ? { left: "50%", width: `${width}%` }
                            : { right: "50%", width: `${width}%` }
                        }
                      />
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noFactor")}</p>
          )}
        </section>
      ) : null}
      {d.advice.length ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{t("advice")}</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {d.advice.map((a) => (
              <li
                key={a.key}
                className="flex flex-col gap-1 rounded-xl bg-muted p-3 text-xs"
              >
                <span className="font-medium">
                  {t(`tip.${a.key}`, a.params)}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {t("saves", {
                    amount: f.vnd.format(a.saved_amount),
                    kwh: f.kwh.format(a.saved_kwh),
                  })}
                  {a.avoids_tier
                    ? ` · ${t("avoidsTier", { tier: a.avoids_tier })}`
                    : null}
                </span>
                <Link
                  href={planHref(d.device_id, a.key)}
                  className={linkButton({
                    size: "md",
                    className: "self-start",
                  })}
                >
                  {t("addToPlan")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Tile>
  )
}

/**
 * A device's forecast on demand (the hover card on its name): from now to the cycle's end with its kWh range and
 * against its usual, then its best advice with the one action, adding it to the plan.
 */
export function DeviceForecastCard({
  device: d,
  periodEnd,
}: {
  device: DeviceForecast
  periodEnd: string
}) {
  const t = useTranslations("billing.deviceForecast")
  const f = formats(useLocale())
  const top = d.advice[0]
  const vs =
    d.explain && (d.method === "weekday" || d.explain.explainable)
      ? t("versus", versusUsual(d.explain))
      : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium tabular-nums">
          {t("rest", {
            end: f.date.format(at(periodEnd)),
            amount: f.vnd.format(d.amount),
          })}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {d.kwh_p10 !== null && d.kwh_p90 !== null
            ? t("range", {
                low: f.kwh.format(d.kwh_p10),
                high: f.kwh.format(d.kwh_p90),
              })
            : `${f.kwh.format(d.kwh)} kWh`}
          {vs ? ` · ${vs}` : null}
        </p>
      </div>
      {top ? (
        <div className="flex flex-col gap-2 rounded-xl bg-muted p-3">
          <p className="flex items-start gap-2 text-sm">
            <IconBulb
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            {t(`tip.${top.key}`, top.params)}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("saves", {
              amount: f.vnd.format(top.saved_amount),
              kwh: f.kwh.format(top.saved_kwh),
            })}
          </p>
          <Link
            href={planHref(d.device_id, top.key)}
            className={linkButton({ size: "md", className: "self-start" })}
          >
            {t("addToPlan")}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
