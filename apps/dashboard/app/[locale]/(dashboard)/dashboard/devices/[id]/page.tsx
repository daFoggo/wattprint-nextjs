import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { getLocale, getTranslations } from "next-intl/server"

import { Badge } from "@workspace/ui/components/hairline/badge"
import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { PageHead } from "@/components/layout/page-head"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { DEVICES_PATH } from "@/config/routes"
import { getCurrentBill } from "@/features/billing/queries"
import { DeviceAbout } from "@/features/energy/components/device-about"
import { DeviceDays } from "@/features/energy/components/device-days"
import { DeviceIcon } from "@/components/shared/device-icon"
import { DeviceChip } from "@/components/shared/nav-links"
import { DeviceStats } from "@/features/energy/components/device-stats"
import { DeviceTimeline } from "@/features/energy/components/device-timeline"
import { PowerChart } from "@/features/energy/components/power-chart"
import { getDashboard, getDevice, getDevices } from "@/features/energy/queries"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.device")
  return { title: t("title") }
}

type Params = PageProps<"/[locale]/dashboard/devices/[id]">["params"]

const href = (id: string) => `${DEVICES_PATH}/${encodeURIComponent(id)}`

/**
 * The device, priced by the bill. Every part of the page calls it; React.cache makes it one read per request.
 * The meter is read alongside the bill, not after it.
 */
async function load(params: Params) {
  const id = decodeURIComponent((await params).id)
  void getDashboard()
  const bill = await getCurrentBill()
  return getDevice(id, bill?.amount_total)
}

/** Previous and next device, in the list's order, wrapping round (the prototype's ‹ ›). */
async function Stepper({ params }: { params: Params }) {
  const id = decodeURIComponent((await params).id)
  const [devices, t] = await Promise.all([
    getDevices(),
    getTranslations("layout.device"),
  ])
  if (!devices || devices.length < 2) return null
  const at = devices.findIndex((d) => d.id === id)
  if (at < 0) return null
  return (
    <nav aria-label={t("neighbours")} className="flex min-w-0 gap-2">
      {[devices.at(at - 1)!, devices[(at + 1) % devices.length]!].map(
        (d, i) => (
          <DeviceChip
            key={d.id}
            href={href(d.id)}
            type={d.type}
            name={d.name}
            dir={i === 0 ? "previous" : "next"}
          />
        )
      )}
    </nav>
  )
}

async function Head({ params }: { params: Params }) {
  const [device, t, locale] = await Promise.all([
    load(params),
    getTranslations("energy"),
    getLocale(),
  ])
  if (!device) notFound()
  const watts = new Intl.NumberFormat(locale).format(device.watts)
  return (
    <PageHead
      title={device.name}
      action={
        <Suspense fallback={<Skeleton shape="block" width={260} height={28} />}>
          <Stepper params={params} />
        </Suspense>
      }
    >
      <span className="flex flex-wrap items-center gap-3">
        <DeviceIcon type={device.type} size="lg" />
        {device.room ? <span>{device.room}</span> : null}
        <Badge tone={device.on ? "success" : "neutral"} dot>
          {device.on ? t("deviceList.onAt", { watts }) : t("deviceList.off")}
        </Badge>
      </span>
    </PageHead>
  )
}

function HeadSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <Skeleton width={200} height={28} />
      <span className="flex items-center gap-3">
        <Skeleton shape="circle" width={48} />
        <Skeleton width={120} />
      </span>
    </div>
  )
}

type Slot = { params: Params; className?: string }

async function Stats({ params, className }: Slot) {
  const device = await load(params)
  return device ? <DeviceStats device={device} className={className} /> : null
}

async function Days({ params, className }: Slot) {
  const device = await load(params)
  return device ? <DeviceDays device={device} className={className} /> : null
}

async function About({ params, className }: Slot) {
  const device = await load(params)
  return device ? <DeviceAbout device={device} className={className} /> : null
}

async function Power({ params, className }: Slot) {
  const [device, t] = await Promise.all([
    load(params),
    getTranslations("energy"),
  ])
  if (!device) return null
  return (
    <PowerChart
      title={t("power.deviceTitle")}
      description={t("sample")}
      ranges={{ day: device.power }}
      now={device.power.at(-1)!.ts + 5 * 60_000}
      className={className}
    />
  )
}

async function Log({ params, className }: Slot) {
  const [device, t] = await Promise.all([
    load(params),
    getTranslations("energy"),
  ])
  if (!device) return null
  return (
    <DeviceTimeline
      title={t("timeline.deviceTitle")}
      description={t("timeline.deviceDescription", {
        count: device.cycles.length,
      })}
      named={false}
      activity={device.cycles.map((c) => ({
        ...c,
        device: device.id,
        name: device.name,
        room: device.room,
      }))}
      className={className}
    />
  )
}

// Rows on lg (12 columns), tiles paired by their natural height so a row's edges line up:
//   the figures 12
//   every day this month 7         | the log of its runs 5
//   the last 24 hours' power 8     | how it compares, and a tip 4
const TILE = {
  stats: "lg:col-span-12",
  days: "lg:col-span-7",
  log: "lg:col-span-5",
  power: "lg:col-span-8",
  about: "lg:col-span-4",
}

export default function DevicePage({ params }: { params: Params }) {
  return (
    <>
      <Suspense fallback={<HeadSkeleton />}>
        <Head params={params} />
      </Suspense>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Suspense
          fallback={
            <Skeleton shape="block" height={96} className={TILE.stats} />
          }
        >
          <Stats params={params} className={TILE.stats} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={400} className={TILE.days} />}
        >
          <Days params={params} className={TILE.days} />
        </Suspense>
        <Suspense fallback={<TileSkeleton height={400} className={TILE.log} />}>
          <Log params={params} className={TILE.log} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={230} className={TILE.power} />}
        >
          <Power params={params} className={TILE.power} />
        </Suspense>
        <Suspense
          fallback={<TileSkeleton height={230} className={TILE.about} />}
        >
          <About params={params} className={TILE.about} />
        </Suspense>
      </div>
    </>
  )
}
