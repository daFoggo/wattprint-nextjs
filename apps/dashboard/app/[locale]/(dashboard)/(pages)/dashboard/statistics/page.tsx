import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { cn } from "@workspace/ui/lib/utils"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { BillForecast } from "@/features/billing/components/bill-forecast"
import { BillHistory } from "@/features/billing/components/bill-history"
import { averagePrice } from "@/features/billing/forecast"
import {
  getBillHistory,
  getCurrentBill,
  getForecast,
} from "@/features/billing/queries"
import { CycleCompare } from "@/features/energy/components/cycle-compare"
import { DailyTrend } from "@/features/energy/components/daily-trend"
import { PowerChart } from "@/features/energy/components/power-chart"
import { RoomSpending } from "@/features/energy/components/room-spending"
import { Standby } from "@/features/energy/components/standby"
import { UsageCompare } from "@/features/energy/components/usage-compare"
import { localDate } from "@/features/energy/days"
import { getDashboard, getDevices, getPower } from "@/features/energy/queries"
import { PeerCompare } from "@/features/insight/components/peer-compare"
import { getCohort } from "@/features/insight/queries"

import { NoHome } from "../../../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.statistics")
  return { title: t("title") }
}

// Each tile reads what it needs (React.cache makes each source one read per request) behind its own boundary, so a
// slow source (the power ranges, the cohort) holds up only its tile. Without a home the power tile says so and the
// rest stay empty. Every tile is a direct child of the grid (Suspense adds no box), so a row stretches its tiles to
// one height.

type Props = { className?: string }

async function Power({ className }: Props) {
  const [power, t] = await Promise.all([
    getPower(),
    getTranslations("energy.power"),
  ])
  if (!power) return <NoHome />
  return (
    <PowerChart
      title={t("title")}
      ranges={power.ranges}
      usual={power.usual}
      now={power.now}
      className={className}
    />
  )
}

async function Forecast({ className }: Props) {
  const [bill, forecast, history] = await Promise.all([
    getCurrentBill(),
    getForecast(),
    getBillHistory(),
  ])
  if (!bill) return null
  return (
    <BillForecast
      bill={bill}
      forecast={forecast}
      lastMonth={history?.at(-1)}
      className={className}
    />
  )
}

async function Rooms({ className }: Props) {
  void getDashboard() // the meter, alongside the bill
  const bill = await getCurrentBill()
  // The devices' money is the bill's, split by their kWh.
  const devices = await getDevices(bill?.amount_total)
  return devices ? (
    <RoomSpending devices={devices} className={className} />
  ) : null
}

async function Days({ className }: Props) {
  const data = await getDashboard()
  return data ? <DailyTrend days={data.days} className={className} /> : null
}

async function Weeks({ className }: Props) {
  const data = await getDashboard()
  return data ? <UsageCompare days={data.days} className={className} /> : null
}

async function Cycle({ className }: Props) {
  const [data, bill] = await Promise.all([getDashboard(), getCurrentBill()])
  if (!data) return null
  return (
    <CycleCompare
      days={data.days}
      // Without a tariff there is no bill cycle: the calendar month stands in.
      start={bill?.period_start ?? `${localDate(data.now).slice(0, 8)}01`}
      now={data.now}
      className={className}
    />
  )
}

async function Peers({ className }: Props) {
  const cohort = await getCohort()
  return cohort && <PeerCompare cohort={cohort} className={className} />
}

async function Months({ className }: Props) {
  const history = await getBillHistory()
  return history ? <BillHistory bills={history} className={className} /> : null
}

async function Background({ className }: Props) {
  const [data, bill] = await Promise.all([getDashboard(), getCurrentBill()])
  if (!data) return null
  return (
    <Standby
      baseline={data.baseline}
      price={(bill && averagePrice(bill)) ?? null}
      now={data.now}
      className={className}
    />
  )
}

// From the moment to the year, as rows on lg (12 columns). Tiles are paired by their natural height, so a row's
// edges line up without stretching a short tile far:
//   power: day, week, 30 and 90 days 12
//   this month's money by room 4 (→ devices) | the week against the one before, then this cycle against the last 8
//   every day, last 30 days 8               | the bill at the cycle's end 4
//   month by month, this year and last 6    | background load 6
//   against similar homes 12 (only with enough real homes, so its absence leaves no hole)
const TILE = {
  power: "lg:col-span-12",
  rooms: "lg:col-span-4",
  compare: "lg:col-span-8",
  days: "lg:col-span-8",
  forecast: "lg:col-span-4",
  months: "lg:col-span-6",
  standby: "lg:col-span-6",
  peers: "lg:col-span-12",
}

export default function StatisticsPage() {
  const t = useTranslations("layout.statistics")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense
          fallback={<TileSkeleton height={230} className={TILE.power} />}
        >
          <Power className={TILE.power} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={540} className={TILE.rooms} />}
        >
          <Rooms className={TILE.rooms} />
        </Suspense>
        {/* Two tiles, one over the other, as tall as the rooms beside them. */}
        <div className={cn("flex min-w-0 flex-col gap-4", TILE.compare)}>
          <Suspense fallback={<TileSkeleton height={300} />}>
            <Weeks />
          </Suspense>
          <Suspense fallback={<TileSkeleton height={230} className="flex-1" />}>
            <Cycle className="flex-1" />
          </Suspense>
        </div>
        <Suspense
          fallback={<TileSkeleton height={410} className={TILE.days} />}
        >
          <Days className={TILE.days} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={410} className={TILE.forecast} />}
        >
          <Forecast className={TILE.forecast} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={330} className={TILE.months} />}
        >
          <Months className={TILE.months} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={330} className={TILE.standby} />}
        >
          <Background className={TILE.standby} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={140} className={TILE.peers} />}
        >
          <Peers className={TILE.peers} />
        </Suspense>
      </div>
    </>
  )
}
