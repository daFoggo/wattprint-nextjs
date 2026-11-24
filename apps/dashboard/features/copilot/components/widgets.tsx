"use client"

import { Component, type ReactNode } from "react"
import { IconArrowRight } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { AreaChart } from "@workspace/ui/components/hairline/area-chart"
import { BalanceMeter } from "@workspace/ui/components/hairline/balance-meter"
import { ComboChart } from "@workspace/ui/components/hairline/combo-chart"
import { CompareBars } from "@workspace/ui/components/hairline/compare-bars"
import { DataTable } from "@workspace/ui/components/hairline/data-table"
import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { Plan } from "@workspace/ui/components/hairline/plan"
import { Sparkline } from "@workspace/ui/components/hairline/sparkline"
import { UsageMeter } from "@workspace/ui/components/hairline/usage-meter"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { CardLink } from "@/components/shared/nav-links"
import { Tile } from "@/components/shared/tile"
import { ALERTS_PATH, PLAN_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"

import { axisLabels, chartView, tableCell } from "../chart"
import type { Widget } from "../schemas"

/** Figures as the dashboard shows them: a muted label under a large value (design system, Metrics). */
function Stats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-4">
      {items.map((s) => (
        <div key={s.label} className="flex flex-col-reverse gap-1">
          <dt className="text-sm text-muted-foreground">{s.label}</dt>
          <dd className="text-2xl font-medium tabular-nums">{s.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** A plan Wappi drew from the device advice: the plan page opens with these actions picked, to start it there. */
function PlanWidget({ widget }: { widget: Extract<Widget, { kind: "plan" }> }) {
  const t = useTranslations("copilot.widgets")
  const tip = useTranslations("billing.deviceForecast")
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
  })
  return (
    <div className="flex flex-col gap-3">
      <Plan
        title={t("plan.title")}
        tasks={widget.actions.map((a) => ({
          label: tip(`tip.${a.key}`, a.params),
          detail: t("plan.task", {
            device: a.device,
            kwh: number.format(a.kwh),
          }),
          status: "pending", // the user's to do, once started on the plan page
        }))}
        defaultOpen
      />
      <Stats
        items={[
          {
            label: t("plan.saving"),
            value: `${number.format(widget.kwh)} kWh`,
          },
          { label: t("plan.money"), value: vnd.format(widget.vnd) },
        ]}
      />
      <p className="text-sm text-muted-foreground">{t("plan.note")}</p>
      <Link
        href={{
          pathname: PLAN_PATH,
          query: { add: widget.actions.map((a) => a.id) },
        }}
        className={linkButton({ size: "md", className: "group self-start" })}
      >
        {t("plan.open")}
        <IconArrowRight
          aria-hidden
          className="size-4 group-hover:translate-x-1 motion-safe:transition-transform motion-safe:duration-200"
        />
      </Link>
    </div>
  )
}

/** "12/11" or "Wed": the day of a compared period, as its bar is labelled. */
function dayLabel(key: string, period: "week" | "cycle", locale: string) {
  const day = new Date(`${key}T00:00:00+07:00`)
  return period === "week"
    ? new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(day)
    : new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      }).format(day)
}

function useFormat() {
  const locale = useLocale()
  return {
    t: useTranslations("copilot.widgets"),
    locale,
    number: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    vnd: new Intl.NumberFormat(locale, { style: "currency", currency: "VND" }),
  }
}

/** A text2sql result: drawn when its values allow it (chartView), else its rows as a table. */
function ChartWidget({
  widget,
}: {
  widget: Extract<Widget, { kind: "chart" }>
}) {
  const { t, locale, number } = useFormat()
  const title = widget.title ?? t("chart.untitled")
  const v = chartView(widget)
  const labels = axisLabels(widget.labels, locale)
  switch (v.view) {
    case "area":
      return (
        <AreaChart
          title={title}
          labels={labels}
          series={v.series}
          defaultLayout="overlap"
          unit={v.unit}
          format={{ maximumFractionDigits: 1 }}
          locales={locale}
        />
      )
    case "combo":
      return (
        <ComboChart
          title={title}
          days={labels.map((label, i) => ({
            key: `${i}`,
            label,
            value: v.series[0]!.values[i]!,
          }))}
          average={v.average}
          series={[v.series[0]!.label, t("chart.average")]}
          unit={v.unit}
          format={{ maximumFractionDigits: 1 }}
          locales={locale}
        />
      )
    case "donut":
      return (
        <DonutChart
          title={title}
          data={labels.map((label, i) => ({
            id: `${i}`,
            label,
            value: v.series[0]!.values[i]!,
          }))}
          unit={v.unit}
          format={{ maximumFractionDigits: 1 }}
          locales={locale}
          legend
        />
      )
    case "kpi":
      return (
        <Tile title={title}>
          <Stats
            items={v.series.map((s, i) => ({
              label: s.label,
              value: [
                number.format(s.values.at(-1) ?? 0),
                widget.series[i]?.unit,
              ]
                .filter(Boolean)
                .join(" "),
            }))}
          />
        </Tile>
      )
    case "table":
      return (
        <DataTable
          label={title}
          columns={widget.columns.map((header, c) => ({
            key: `${c}`,
            header,
            cell: (row: Record<string, string | number | null>) =>
              tableCell(row[`${c}`] ?? null, locale),
          }))}
          rows={widget.rows.map((r, i) => ({
            id: `${i}`,
            ...Object.fromEntries(r.map((cell, c) => [`${c}`, cell])),
          }))}
          pageSize={10}
        />
      )
  }
}

type WidgetComponents = {
  [K in Widget["kind"]]: (props: {
    widget: Extract<Widget, { kind: K }>
  }) => ReactNode
}

/** One component per kind: a kind in the schema without one here, or the reverse, does not compile. */
const WIDGETS: WidgetComponents = {
  devices: function Devices({ widget }) {
    const { t, locale } = useFormat()
    return (
      <DonutChart
        title={t("devices")}
        data={widget.slices}
        centerLabel={t("devicesCenter")}
        unit="kWh"
        format={{ maximumFractionDigits: 1 }}
        locales={locale}
        legend
      />
    )
  },
  compare: function Compare({ widget }) {
    const { t, locale } = useFormat()
    return (
      <CompareBars
        title={t(`compare.${widget.period}.title`)}
        data={widget.data.map((d) => ({
          ...d,
          label: dayLabel(d.key, widget.period, locale),
        }))}
        currentLabel={t(`compare.${widget.period}.current`)}
        previousLabel={t(`compare.${widget.period}.previous`)}
        defaultCompared
        unit="kWh"
        format={{ maximumFractionDigits: 1 }}
        locales={locale}
      />
    )
  },
  forecast: function Forecast({ widget }) {
    const { t, locale, number, vnd } = useFormat()
    return (
      <Tile title={t("forecast.title")}>
        <Stats
          items={[
            {
              label: t("forecast.kwh"),
              value: `${number.format(widget.kwh)} kWh`,
            },
            { label: t("forecast.vnd"), value: vnd.format(widget.vnd) },
          ]}
        />
        {widget.limit ? (
          <UsageMeter
            used={widget.used}
            limit={widget.limit}
            unit="kWh"
            label={t("forecast.meter")}
            locales={locale}
          />
        ) : null}
      </Tile>
    )
  },
  weather: function Weather({ widget }) {
    const { t } = useFormat()
    return (
      <Tile title={t("weather.title")}>
        <Stats
          items={[
            { label: t("weather.temp"), value: `${widget.temp} °C` },
            { label: t("weather.feels"), value: `${widget.feels} °C` },
            { label: t("weather.humidity"), value: `${widget.humidity}%` },
          ]}
        />
      </Tile>
    )
  },
  plan: PlanWidget,
  peers: function Peers({ widget }) {
    const { t, locale, number } = useFormat()
    return (
      <BalanceMeter
        title={t("peers.title", {
          homes: number.format(widget.homes),
          days: widget.days,
        })}
        unit="kWh"
        inflow={{ label: t("peers.you"), value: widget.you }}
        outflow={{ label: t("peers.median"), value: widget.median }}
        format={{ maximumFractionDigits: 0 }}
        locales={locale}
      />
    )
  },
  standby: function Standby({ widget }) {
    const { t, number, vnd } = useFormat()
    return (
      <Tile title={t("standby.title")}>
        <Stats
          items={[
            { label: t("standby.label"), value: `${widget.watts.at(-1)} W` },
            {
              label: t("standby.kwh"),
              value: `${number.format(widget.kwh)} kWh`,
            },
            ...(widget.vnd === null
              ? []
              : [{ label: t("standby.vnd"), value: vnd.format(widget.vnd) }]),
          ]}
        />
        <Sparkline
          data={widget.watts}
          width="100%"
          height={56}
          variant="area"
          color="primary"
          showScrubber
          showLastPoint
          suffix=" W"
          label={t("standby.title")}
        />
      </Tile>
    )
  },
  links: function Links({ widget }) {
    const { t } = useFormat()
    return (
      <div className="flex flex-wrap gap-2">
        {widget.links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={linkButton({
              variant: "outline",
              size: "md",
              className: "group",
            })}
          >
            {t(`links.${l.key}`)}
            <IconArrowRight
              aria-hidden
              className="size-4 group-hover:translate-x-1 motion-safe:transition-transform motion-safe:duration-200"
            />
          </Link>
        ))}
      </div>
    )
  },
  chart: ChartWidget,
  watch: function Watch({ widget }) {
    const { t, locale, number, vnd } = useFormat()
    const figure = (n: number) =>
      widget.unit === "vnd"
        ? vnd.format(n)
        : `${number.format(n)} ${{ kwh: "kWh", w: "W" }[widget.unit] ?? widget.unit}`.trim()
    const until = new Intl.DateTimeFormat(locale, {
      timeZone: "Asia/Ho_Chi_Minh",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(Date.parse(widget.ends_at) - 1) // an end at midnight belongs to the day before
    return (
      <Tile
        title={t("watch.title")}
        description={widget.label}
        action={
          widget.ended ? undefined : (
            <CardLink href={`${ALERTS_PATH}#watch-${widget.id}`}>
              {t("watch.view")}
            </CardLink>
          )
        }
      >
        <p className="text-sm">
          {t("watch.condition", {
            op: widget.op,
            value: figure(widget.threshold),
          })}
        </p>
        <Stats
          items={[
            ...(widget.value === null
              ? []
              : [{ label: t("watch.now"), value: figure(widget.value) }]),
            {
              label: t("watch.until"),
              value: widget.ended ? t("watch.ended") : until,
            },
          ]}
        />
      </Tile>
    )
  },
}

/** A widget that throws while rendering shows nothing; the rest of the answer stays. */
class WidgetBoundary extends Component<
  { kind: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn("copilot widget failed", this.props.kind, error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * The data behind an answer, drawn with the same Hairline charts as the dashboard so a figure reads alike in both
 * places. Each widget is self-carded (`bg-background`), so it sits as a card on the panel's plate or on the page.
 */
export function CopilotWidget({ widget }: { widget: Widget }) {
  const Body = WIDGETS[widget.kind] as (props: { widget: Widget }) => ReactNode
  return (
    <WidgetBoundary kind={widget.kind}>
      <Body widget={widget} />
    </WidgetBoundary>
  )
}
