import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { HideOnError } from "@/components/shared/hide-on-error"
import { Stagger } from "@/components/shared/stagger"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { BillSummary } from "@/features/billing/components/bill-summary"
import { getCurrentBill } from "@/features/billing/queries"
import { DeviceMix } from "@/features/energy/components/device-mix"
import { DeviceTimeline } from "@/features/energy/components/device-timeline"
import {
  getActivity,
  getDashboard,
  getDevices,
} from "@/features/energy/queries"
import { AlertList } from "@/features/insight/components/alert-list"
import { getAlerts } from "@/features/insight/queries"
import { WeatherCard } from "@/features/weather/components/weather-card"
import { getWeather } from "@/features/weather/queries"
import { requirePermission } from "@/lib/dal"

import { NoHome } from "../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.overview")
  return { title: t("title") }
}

// What a visitor wants on opening the app, as a bento on lg (12 columns); each tile leads on:
//   by device 4 (→ statistics)        | bill and tiers 8 (→ the bill; folded until opened)
//   out of the ordinary 5 (→ devices) | device log 7
const TILE = {
  mix: "lg:col-span-4",
  bill: "lg:col-span-8",
  alerts: "lg:col-span-5",
  activity: "lg:col-span-7",
}

async function Guard() {
  await requirePermission("account:view")
  return null
}

/**
 * Every tile, from one read per source (React.cache dedupes them per request). Returns a
 * fragment, so each tile is a direct child of the grid and of Stagger. Without a home, nothing
 * live or sampled is shown: it would describe a home the account does not have.
 */
async function Tiles() {
  const [data, bill, activity, alerts, t] = await Promise.all([
    getDashboard(),
    getCurrentBill(),
    getActivity(),
    getAlerts(),
    getTranslations("energy"),
  ])
  // The devices' money is the bill's, split by their kWh.
  const devices = await getDevices(bill?.amount_total)
  if (!data || !devices || !activity) return <NoHome />
  return (
    <>
      {/* No tariff on the home: nothing to price, so the device mix takes the row. */}
      <DeviceMix
        devices={devices}
        className={bill ? TILE.mix : "lg:col-span-12"}
      />
      {bill ? <BillSummary bill={bill} className={TILE.bill} /> : null}
      <AlertList
        alerts={alerts}
        now={data.now}
        brief
        className={data.latest ? TILE.alerts : "lg:col-span-12"}
      />
      {/* No meter data yet: the activity sample would pretend otherwise. */}
      {data.latest ? (
        <DeviceTimeline
          activity={activity}
          title={t("timeline.title")}
          description={t("timeline.description")}
          className={TILE.activity}
        />
      ) : null}
    </>
  )
}

/** Without a key there is no weather card; with OpenWeather down, HideOnError hides it. */
async function Weather() {
  const weather = await getWeather(await getLocale())
  return weather ? <WeatherCard weather={weather} /> : null
}

function TileSkeletons() {
  return (
    <>
      <TileSkeleton className={TILE.mix} height={260} />
      <TileSkeleton className={TILE.bill} height={260} />
      <TileSkeleton className={TILE.alerts} height={300} />
      <TileSkeleton className={TILE.activity} height={300} />
    </>
  )
}

export default function DashboardPage() {
  const t = useTranslations("layout.overview")
  return (
    <>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHead
        title={t("title")}
        action={
          <HideOnError>
            <Suspense fallback={null}>
              <Weather />
            </Suspense>
          </HideOnError>
        }
      >
        {t("description")}
      </PageHead>
      {/* Each direct child is a tile: Stagger slides them in one after another as they stream. */}
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense fallback={<TileSkeletons />}>
          <Tiles />
        </Suspense>
      </Stagger>
    </>
  )
}
