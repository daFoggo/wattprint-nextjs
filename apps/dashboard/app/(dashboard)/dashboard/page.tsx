import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@workspace/ui/components/hairline/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { PageHead } from "@/components/layout/page-head"
import { HideOnError } from "@/components/shared/hide-on-error"
import { Stagger } from "@/components/shared/stagger"
import { DailyTrend } from "@/features/energy/components/daily-trend"
import { DeviceList } from "@/features/energy/components/device-list"
import { DeviceMix } from "@/features/energy/components/device-mix"
import { DeviceTimeline } from "@/features/energy/components/device-timeline"
import { LivePower } from "@/features/energy/components/live-power"
import { UsageCompare } from "@/features/energy/components/usage-compare"
import { getDashboard } from "@/features/energy/queries"
import { WeatherCard } from "@/features/weather/components/weather-card"
import { getWeather } from "@/features/weather/queries"
import { requirePermission } from "@/lib/dal"

export const metadata: Metadata = { title: "Overview" }

// Bento on lg (12 columns), widths alternating so no two rows line up; devices lead, top left,
// then one row about energy and one about devices:
//   by device 4 | live 8
//   30 days 8   | compare 4
//   activity 4  | devices 8
const TILE = {
  mix: "lg:col-span-4",
  live: "lg:col-span-8",
  devices: "lg:col-span-8",
  compare: "lg:col-span-4",
  activity: "lg:col-span-4",
  trend: "lg:col-span-8",
}

/** A fixed-size placeholder in the tile's slot (no random sizes while prerendering). */
function TileSkeleton({
  className,
  height,
}: {
  className: string
  height: number
}) {
  return (
    <div className={cn("rounded-3xl bg-card p-6", className)}>
      <Skeleton shape="block" height={height} />
    </div>
  )
}

async function Guard() {
  await requirePermission("account:view")
  return null
}

/**
 * Every tile, from one getDashboard() call (React.cache dedupes it per request). Returns a
 * fragment, so each tile is a direct child of the grid and of Stagger. Without a home, nothing
 * live or sampled is shown: it would describe a home the account does not have.
 */
async function Tiles() {
  const data = await getDashboard()
  if (!data) {
    return (
      <section className="flex flex-col gap-2 rounded-3xl bg-card p-6 lg:col-span-12">
        <h2 className="text-base font-medium">No home yet</h2>
        <p className="text-sm text-muted-foreground">
          This account is not a member of a home. Ask the owner for an invite
          code, or pair a meter.
        </p>
      </section>
    )
  }
  const { latest, days } = data
  return (
    <>
      <DeviceMix className={TILE.mix} />
      <LivePower className={TILE.live} />
      <DailyTrend days={days} className={TILE.trend} />
      <UsageCompare days={days} className={TILE.compare} />
      {/* No meter data yet: the activity sample would pretend otherwise. */}
      {latest ? (
        <DeviceTimeline latest={Date.parse(latest)} className={TILE.activity} />
      ) : null}
      <DeviceList className={latest ? TILE.devices : "lg:col-span-12"} />
    </>
  )
}

/** Without a key there is no weather card; with OpenWeather down, HideOnError hides it. */
async function Weather() {
  const weather = await getWeather()
  return weather ? <WeatherCard weather={weather} /> : null
}

function TileSkeletons() {
  return (
    <>
      <TileSkeleton className={TILE.mix} height={320} />
      <TileSkeleton className={TILE.live} height={320} />
      <TileSkeleton className={TILE.trend} height={360} />
      <TileSkeleton className={TILE.compare} height={360} />
      <TileSkeleton className={TILE.activity} height={360} />
      <TileSkeleton className={TILE.devices} height={360} />
    </>
  )
}

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={null}>
        <Guard />
      </Suspense>
      <PageHead
        title="Overview"
        action={
          <HideOnError>
            <Suspense fallback={null}>
              <Weather />
            </Suspense>
          </HideOnError>
        }
      >
        Your home right now, against the weeks before, and where the energy
        goes.
      </PageHead>
      {/* Each direct child is a tile: Stagger slides them in one after another as they stream. */}
      <Stagger className="grid grid-cols-1 gap-4 *:nth-6:delay-500 lg:grid-cols-12">
        <Suspense fallback={<TileSkeletons />}>
          <Tiles />
        </Suspense>
      </Stagger>
    </>
  )
}
