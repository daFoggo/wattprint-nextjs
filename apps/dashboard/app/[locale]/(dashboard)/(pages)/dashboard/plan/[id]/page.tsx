import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { PageHead } from "@/components/layout/page-head"
import { HideOnError } from "@/components/shared/hide-on-error"
import { DeviceChip } from "@/components/shared/nav-links"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { planPath } from "@/config/routes"
import { getCurrentBill } from "@/features/billing/queries"
import { getDevices } from "@/features/energy/queries"
import { at, formats } from "@/features/plan/components/plan-data"
import { TONE } from "@/features/plan/components/plan-history"
import { outcomeOf } from "@/features/plan/math"
import { PlanRecord } from "@/features/plan/components/plan-record"
import { getPlanById, getPlanHistory } from "@/features/plan/queries"

export async function generateMetadata({
  params,
}: {
  params: Params
}): Promise<Metadata> {
  const [plan, t, locale] = await Promise.all([
    load(params),
    getTranslations("plan.history"),
    getLocale(),
  ])
  if (!plan) return { title: t("pageTitle") }
  const f = formats(locale)
  return {
    title: t("recordTitle", {
      span: t("span", {
        from: f.date.format(at(plan.start_on)),
        to: f.dateYear.format(at(plan.end_on)),
      }),
    }),
  }
}

type Params = PageProps<"/[locale]/dashboard/plan/[id]">["params"]

/** The plan, one read per request (React.cache) for the head and the body. */
async function load(params: Params) {
  return getPlanById(decodeURIComponent((await params).id))
}

/** The older and the newer past plan, as the device page steps between devices; none past either end. */
async function Stepper({ params }: { params: Params }) {
  const id = decodeURIComponent((await params).id)
  const [history, t, locale] = await Promise.all([
    getPlanHistory(),
    getTranslations("plan.history"),
    getLocale(),
  ])
  const i = (history ?? []).findIndex((p) => p.id === id)
  if (!history || i < 0) return null
  const f = formats(locale)
  // Newest first: the one after is older, the one before is newer.
  const steps = [
    { plan: history[i + 1], dir: "previous" as const },
    { plan: history[i - 1], dir: "next" as const },
  ].flatMap((s) => (s.plan ? [{ ...s, plan: s.plan }] : []))
  if (!steps.length) return null
  return (
    <nav aria-label={t("neighbours")} className="flex min-w-0 gap-2">
      {steps.map(({ plan, dir }) => (
        <DeviceChip
          key={plan.id}
          href={planPath(plan.id)}
          name={t("span", {
            from: f.date.format(at(plan.start_on)),
            to: f.dateYear.format(at(plan.end_on)),
          })}
          dir={dir}
        />
      ))}
    </nav>
  )
}

async function Head({ params }: { params: Params }) {
  const [plan, t, locale] = await Promise.all([
    load(params),
    getTranslations("plan.history"),
    getLocale(),
  ])
  if (!plan) notFound()
  const f = formats(locale)
  const o = outcomeOf(plan)
  return (
    <PageHead
      title={t("recordTitle", {
        span: t("span", {
          from: f.date.format(at(plan.start_on)),
          to: f.dateYear.format(at(plan.end_on)),
        }),
      })}
      action={
        // The history down only drops the older/newer chips, never the plan.
        <HideOnError>
          <Suspense
            fallback={<Skeleton shape="block" width={260} height={28} />}
          >
            <Stepper params={params} />
          </Suspense>
        </HideOnError>
      }
    >
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[o.verdict]} dot>
          {t(`verdict.${o.verdict}`)}
        </Badge>
        <span>
          {o.whole ? t("whole") : t("stoppedAfter", { n: o.ranDays })}
        </span>
        {plan.mine ? null : <Badge outline>{t("sample")}</Badge>}
      </span>
    </PageHead>
  )
}

async function Body({ params }: { params: Params }) {
  // The devices' types come from the list the breadcrumb reads in this request already.
  const [plan, bill, devices] = await Promise.all([
    load(params),
    getCurrentBill(),
    getDevices(),
  ])
  if (!plan || !bill) return null
  return (
    <PlanRecord
      plan={plan}
      tiers={bill.tiers}
      vat={bill.vat_rate}
      deviceTypes={Object.fromEntries(
        (devices ?? []).map((d) => [d.id, d.type])
      )}
    />
  )
}

export default function PlanRecordPage({ params }: { params: Params }) {
  return (
    <>
      <Suspense fallback={<Skeleton width={240} height={28} />}>
        <Head params={params} />
      </Suspense>
      <Suspense fallback={<TileSkeleton height={420} />}>
        <Body params={params} />
      </Suspense>
    </>
  )
}
