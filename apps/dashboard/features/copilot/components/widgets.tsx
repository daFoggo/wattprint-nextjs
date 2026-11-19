"use client"

import { useState } from "react"
import { IconArrowRight } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { ApprovalCard } from "@workspace/ui/components/hairline/approval-card"
import { BalanceMeter } from "@workspace/ui/components/hairline/balance-meter"
import { CompareBars } from "@workspace/ui/components/hairline/compare-bars"
import { DonutChart } from "@workspace/ui/components/hairline/donut-chart"
import { Plan } from "@workspace/ui/components/hairline/plan"
import { Sparkline } from "@workspace/ui/components/hairline/sparkline"
import { toast } from "@workspace/ui/components/hairline/toast-stack"
import { UsageMeter } from "@workspace/ui/components/hairline/usage-meter"
import { linkButton } from "@workspace/ui-patterns/link-button"

import { Tile } from "@/components/shared/tile"
import { Link } from "@/i18n/navigation"

import { acceptPlanAction } from "../actions"
import type { Widget } from "../schemas"
import { useCopilot } from "./copilot-provider"

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

/** A plan Wappi saved: its tasks, and Start, which begins the 14-day trial on the backend. */
function PlanWidget({ widget }: { widget: Extract<Widget, { kind: "plan" }> }) {
  const t = useTranslations("copilot.widgets")
  const locale = useLocale()
  const { react } = useCopilot()
  const [status, setStatus] = useState(widget.status)
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
  })
  const kwh = `${number.format(widget.kwh)} kWh`
  return (
    <div className="flex flex-col gap-3">
      <Plan
        title={t("plan.title")}
        tasks={widget.tasks.map((task) => ({
          ...task,
          status: "pending", // the user's to do; the trial is measured, not ticked off
        }))}
        defaultOpen
      />
      {status === "accepted" ? (
        <p className="text-sm text-muted-foreground">{t("plan.running")}</p>
      ) : (
        <ApprovalCard
          title={t("plan.approval")}
          description={t("plan.description")}
          details={[
            {
              label: t("plan.saving"),
              value:
                widget.vnd === null
                  ? t("plan.savingKwh", { kwh })
                  : t("plan.savingValue", { kwh, vnd: vnd.format(widget.vnd) }),
            },
            { label: t("plan.length"), value: t("plan.lengthValue") },
          ]}
          approveLabel={t("plan.approve")}
          denyLabel={t("plan.deny")}
          onApprove={async () => {
            try {
              setStatus(await acceptPlanAction(widget.id))
              react("celebrating")
              toast.success(t("plan.started"))
            } catch {
              toast.error(t("plan.failed"))
            }
          }}
        />
      )}
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

/**
 * The data behind an answer, drawn with the same Hairline charts as the dashboard so a figure reads alike in both
 * places. Each widget is self-carded (`bg-background`), so it sits as a card on the panel's plate or on the page.
 */
export function CopilotWidget({ widget }: { widget: Widget }) {
  const t = useTranslations("copilot.widgets")
  const locale = useLocale()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const vnd = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
  })

  switch (widget.kind) {
    case "devices":
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
    case "compare":
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
    case "forecast":
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
    case "weather":
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
    case "plan":
      return <PlanWidget widget={widget} />
    case "peers":
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
    case "standby":
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
    case "links":
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
  }
}
