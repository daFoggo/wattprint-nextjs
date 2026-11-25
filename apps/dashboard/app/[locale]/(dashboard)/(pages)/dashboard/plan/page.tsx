import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { PageHead } from "@/components/layout/page-head"
import { HideOnError } from "@/components/shared/hide-on-error"
import { PillLink } from "@/components/shared/nav-links"
import { PLAN_HISTORY_PATH } from "@/config/routes"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import {
  getCurrentBill,
  getDeviceForecasts,
  getForecast,
} from "@/features/billing/queries"
import { backgroundLoad, localDate } from "@/features/energy/days"
import { getDashboard, getDevice } from "@/features/energy/queries"
import { SavingsPlan } from "@/features/plan/components/savings-plan"
import type { PlanData } from "@/features/plan/components/plan-data"
import { adviceRange, measuredBy } from "@/features/plan/math"
import { getPlan, getPlanBasis, getPlanHistory } from "@/features/plan/queries"

const DAY = 86_400_000

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.plan")
  return { title: t("title") }
}

/**
 * Composes the plan's inputs from billing (tiers, the cycle's forecast, priced device advice), energy (background
 * load, the devices' days) and the plan's own backend (the running plan with its frozen days, and the basis a new
 * one would be measured against).
 */
async function Content() {
  const [bill, forecast, devices, dashboard, basis, plan, t, advice] =
    await Promise.all([
      getCurrentBill(),
      getForecast(),
      getDeviceForecasts(),
      getDashboard(),
      getPlanBasis(),
      getPlan(),
      getTranslations("layout.plan"),
      getTranslations("billing.deviceForecast"),
    ])
  // A running plan stays readable from its own record when the basis or forecast is gone mid-cycle.
  const measured = measuredBy(plan, basis, forecast)
  if (!bill || !dashboard || !measured) {
    const running = plan !== null && !bill // a tariff removed under a running plan: say why
    return (
      <section className="rounded-3xl bg-card p-6">
        <EmptyState
          scene="inbox"
          title={t(running ? "noTariffTitle" : "emptyTitle")}
          description={t(running ? "noTariff" : "emptyDescription")}
        />
      </section>
    )
  }
  const advised = (devices?.devices ?? []).filter((d) => d.advice.length)
  // The planned devices too: their advice may be gone once the plan works, their days are still needed.
  const ids = new Set([
    ...advised.map((d) => d.device_id),
    ...(plan?.actions.flatMap((a) => (a.device_id ? [a.device_id] : [])) ?? []),
  ])
  const details = await Promise.all([...ids].map((id) => getDevice(id)))
  const today = localDate(dashboard.now)
  const data: PlanData = {
    today,
    periodEnd: measured.periodEnd,
    daysLeft:
      Math.round((Date.parse(measured.periodEnd) - Date.parse(today)) / DAY) +
      1,
    minStart:
      measured.earliestStart === null || measured.earliestStart > today
        ? today
        : measured.earliestStart,
    forecastKwh: measured.forecastKwh,
    billKwh: bill.kwh,
    tiers: bill.tiers,
    vat: bill.vat_rate,
    model: measured.model,
    sigma: measured.sigma,
    alwaysOnW: backgroundLoad(dashboard.baseline, dashboard.now),
    advice: advised.flatMap((d) =>
      d.advice.map((a) => ({
        id: `${d.device_id}.${a.key}`,
        deviceId: d.device_id,
        key: a.key,
        device: d.name,
        type: d.type,
        label: advice(`tip.${a.key}`, a.params),
        kwh: a.saved_kwh,
        amount: a.saved_amount,
        avoidsTier: a.avoids_tier,
        range: adviceRange(a.saved_kwh, d.error_pct),
        baseline: d.explain?.usual_kwh_day ?? null,
      }))
    ),
    deviceTypes: Object.fromEntries(
      details.flatMap((d) => (d ? [[d.id, d.type]] : []))
    ),
    deviceDays: Object.fromEntries(
      details.flatMap((d) =>
        d ? [[d.id, d.days.map(({ date, kwh }) => ({ date, kwh }))]] : []
      )
    ),
  }
  return <SavingsPlan data={data} plan={plan} />
}

/** The way to the past plans, beside the title; the page itself stays on the plan at hand. */
async function HistoryLink() {
  const [history, t] = await Promise.all([
    getPlanHistory(),
    getTranslations("plan.history"),
  ])
  if (!history?.length) return null
  return (
    <PillLink href={PLAN_HISTORY_PATH}>
      {t("link", { n: history.length })}
    </PillLink>
  )
}

export default function PlanPage() {
  const t = useTranslations("layout.plan")
  return (
    <>
      <PageHead
        title={t("title")}
        action={
          // The history down only drops its link, never the plan page.
          <HideOnError>
            <Suspense
              fallback={<Skeleton shape="block" width={160} height={28} />}
            >
              <HistoryLink />
            </Suspense>
          </HideOnError>
        }
      >
        {t("description")}
      </PageHead>
      <Suspense fallback={<TileSkeleton height={286} mobile={445} />}>
        <Content />
      </Suspense>
    </>
  )
}
