"use client"

import { IconArrowRight, IconCheck } from "@tabler/icons-react"
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
          title={t("compare")}
          data={widget.data}
          currentLabel={widget.currentLabel}
          previousLabel={widget.previousLabel}
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
          <UsageMeter
            used={widget.used}
            limit={widget.limit}
            unit="kWh"
            label={t("forecast.meter")}
            locales={locale}
          />
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
          <div className="flex flex-col gap-2">
            <h3 className="text-sm text-muted-foreground">
              {t("weather.tips")}
            </h3>
            <ul className="flex flex-col gap-2">
              {widget.tips.map((tip) => (
                <li key={tip} className="flex items-center gap-2 text-sm">
                  <IconCheck
                    aria-hidden
                    className="size-4 shrink-0 text-primary"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </Tile>
      )
    case "plan":
      return (
        <div className="flex flex-col gap-3">
          <Plan
            title={t("plan.title")}
            tasks={widget.tasks.map((task) => ({ ...task, status: "pending" }))}
            defaultOpen
          />
          <ApprovalCard
            title={t("plan.approval")}
            description={t("plan.description")}
            details={[
              {
                label: t("plan.saving"),
                value: t("plan.savingValue", {
                  kwh: number.format(widget.kwh),
                  vnd: vnd.format(widget.vnd),
                }),
              },
              { label: t("plan.length"), value: t("plan.lengthValue") },
            ]}
            approveLabel={t("plan.approve")}
            denyLabel={t("plan.deny")}
            // shortcut: no experiment engine yet; starting a trial becomes a Server Action when it lands.
            onApprove={() => toast.success(t("plan.started"))}
          />
        </div>
      )
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
              { label: t("standby.vnd"), value: vnd.format(widget.vnd) },
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
              {l.label}
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
