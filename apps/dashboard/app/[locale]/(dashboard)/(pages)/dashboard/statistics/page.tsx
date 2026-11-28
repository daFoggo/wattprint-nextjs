import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { ByDayNote } from "@/components/shared/by-day-note"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { BillForecast } from "@/features/billing/components/bill-forecast"
import { DeviceForecastCard } from "@/features/billing/components/device-forecast"
import { DeviceForecastMarks } from "@/features/billing/components/device-forecast-marks"
import { averagePrice } from "@/features/billing/forecast"
import {
  getBillHistory,
  getCurrentBill,
  getDeviceForecasts,
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
// slow source (the power ranges, the cohort) holds up only its tile (the rooms tile also waits for the device
// forecasts, to know whether it has the row to itself). Without a home `Groups` shows NoHome once.
// Every tile is a direct child of its group's grid (Suspense adds no box), so a row stretches its tiles to one
// height; a tile whose partner in the row will not render takes the whole row (`alone`), leaving no half-empty row.

type Props = { className?: string }

async function Power({ className }: Props) {
  const [power, t] = await Promise.all([
    getPower(),
    getTranslations("energy.power"),
  ])
  if (!power) return null // no home: the page shows NoHome once (Groups)
  return (
    <PowerChart
      title={t("title")}
      description={t("description")}
      ranges={power.ranges}
      usual={power.usual}
      now={power.now}
      coarsened={power.coarsened}
      className={className}
    />
  )
}

async function Forecast({ className }: Props) {
  const [bill, forecast, history] = await Promise.all([
    getCurrentBill(),
    getForecast(),
    getBillHistory(), // last cycle, for the change against it
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

/**
 * This cycle's cost by device; each device's forecast to the cycle's end rides along (marks, a hover card). A failed
 * forecast read throws here, as its own tile did; none yet (before a bill forecast) leaves the rows plain.
 */
async function Rooms({ className }: Props) {
  void getDashboard() // the meter, alongside the bill
  const [bill, forecasts] = await Promise.all([
    getCurrentBill(),
    getDeviceForecasts(),
  ])
  const devices = await getDevices(bill?.amount_total)
  if (!devices) return null
  const extras = Object.fromEntries(
    (forecasts?.devices ?? []).map((d) => [
      d.device_id,
      {
        marks: <DeviceForecastMarks key={d.device_id} device={d} />,
        card: (
          <DeviceForecastCard
            key={d.device_id}
            device={d}
            periodEnd={forecasts!.period_end}
          />
        ),
      },
    ])
  )
  return (
    <RoomSpending
      devices={devices}
      extras={extras}
      // Forecast is its partner: without a tariff it does not render.
      className={bill ? className : "lg:col-span-12"}
    />
  )
}

async function Days({ className }: Props) {
  const data = await getDashboard()
  if (!data) return null
  // By day only there is no background load beside it: it takes the row.
  return (
    <DailyTrend
      days={data.days}
      className={data.byDay ? "lg:col-span-12" : className}
    />
  )
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
  const [cohort, t] = await Promise.all([
    getCohort(),
    getTranslations("layout.statistics"),
  ])
  if (!cohort) return null
  return (
    <Group title={t("peers")}>
      <PeerCompare cohort={cohort} className={className} />
    </Group>
  )
}

async function Background({ className }: Props) {
  const [data, bill] = await Promise.all([getDashboard(), getCurrentBill()])
  if (!data || data.byDay) return null
  return (
    <Standby
      baseline={data.baseline}
      price={(bill && averagePrice(bill)) ?? null}
      now={data.now}
      className={className}
    />
  )
}

// Two groups and the peers, as rows on lg (12 columns), tiles paired by their natural height so a row's edges line up;
// only the peers carry a heading:
//   this cycle's money by device (→ room; each device's forecast on hover) 7 | the bill at the cycle's end 5
//   power: day, week, 30 and 90 days 12
//   the week against the one before 6 | this cycle against the last 8 6
//   every day, last 30 days 8 | background load 4
//   against similar homes 12 (its own heading; absent without enough real homes, so no empty group)
const TILE = {
  forecast: "lg:col-span-5",
  rooms: "lg:col-span-7",
  power: "lg:col-span-12",
  weeks: "lg:col-span-6",
  cycle: "lg:col-span-6",
  days: "lg:col-span-8",
  standby: "lg:col-span-4",
  peers: "lg:col-span-12",
}

/** Each tile's skeleton body (lg, below lg): the loaded tile, or its row, measured minus 90 px. */
const SKELETON = {
  rooms: [298, 618],
  forecast: [298, 174],
  power: [206, 254],
  weeks: [287, 267],
  cycle: [287, 214],
  days: [386, 310],
  standby: [386, 378],
} as const

function Skeleton({ tile }: { tile: keyof typeof SKELETON }) {
  const [height, mobile] = SKELETON[tile]
  return <TileSkeleton height={height} mobile={mobile} className={TILE[tile]} />
}

/** Before the home is known: the page's grid of skeletons, so nothing moves when the tiles take their places. */
function PageSkeleton() {
  return (
    <>
      <Group>
        <Skeleton tile="rooms" />
        <Skeleton tile="forecast" />
        <Skeleton tile="power" />
      </Group>
      <Group>
        <Skeleton tile="weeks" />
        <Skeleton tile="cycle" />
        <Skeleton tile="days" />
        <Skeleton tile="standby" />
      </Group>
    </>
  )
}

/** A group of tiles, under its heading when it has one. */
function Group({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      {title ? <h2 className="text-lg font-medium">{title}</h2> : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">{children}</div>
    </section>
  )
}

/** One line saying why blocks are missing for a member who sees days only. `Groups` has awaited the same read. */
async function ByDay() {
  const data = await getDashboard()
  return data?.byDay ? <ByDayNote /> : null
}

/** Without a home there is nothing to group: one empty state, not headings over empty rows. */
async function Groups({ children }: { children: React.ReactNode }) {
  // Start the tiles' reads now, not after the home check: React.cache hands them the same promises.
  // Each tile awaits the same promise and shows its own error; the catch only keeps an early failure (before the
  // tiles mount) out of the log as an unhandled rejection.
  for (const read of [
    getPower,
    getCurrentBill,
    getBillHistory,
    getDeviceForecasts,
    getCohort,
  ])
    read().catch(() => null)
  const data = await getDashboard()
  return data ? children : <NoHome />
}

export default function StatisticsPage() {
  const t = useTranslations("layout.statistics")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <Suspense fallback={<PageSkeleton />}>
        <Groups>
          <Group>
            <Suspense fallback={<Skeleton tile="rooms" />}>
              <Rooms className={TILE.rooms} />
            </Suspense>
            <Suspense fallback={<Skeleton tile="forecast" />}>
              <Forecast className={TILE.forecast} />
            </Suspense>
            <Suspense fallback={<Skeleton tile="power" />}>
              <Power className={TILE.power} />
            </Suspense>
          </Group>
          <Group>
            <Suspense fallback={<Skeleton tile="weeks" />}>
              <Weeks className={TILE.weeks} />
            </Suspense>
            <Suspense fallback={<Skeleton tile="cycle" />}>
              <Cycle className={TILE.cycle} />
            </Suspense>
            <Suspense fallback={<Skeleton tile="days" />}>
              <Days className={TILE.days} />
            </Suspense>
            <Suspense fallback={<Skeleton tile="standby" />}>
              <Background className={TILE.standby} />
            </Suspense>
          </Group>
          <ByDay />
          <Suspense fallback={<TileSkeleton height={140} />}>
            <Peers className={TILE.peers} />
          </Suspense>
        </Groups>
      </Suspense>
    </>
  )
}
