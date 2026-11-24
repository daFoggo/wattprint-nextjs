import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import { Skeleton } from "@workspace/ui/components/hairline/skeleton"

import { PageHead } from "@/components/layout/page-head"
import { Tile } from "@/components/shared/tile"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { getBillHistory, getCurrentBill } from "@/features/billing/queries"
import {
  getDashboard,
  getDevice,
  getDevices,
  getPower,
} from "@/features/energy/queries"
import { saveHomeSettingsAction } from "@/features/home/actions"
import { getHomeSettings, isDemoViewer } from "@/features/home/queries"
import {
  acknowledgeAlertAction,
  cancelWatchAction,
  saveWatchAction,
  sendAlertFeedbackAction,
  setDeviceEventAction,
} from "@/features/insight/actions"
import { AddAlert } from "@/features/insight/components/add-alert"
import { AlertList } from "@/features/insight/components/alert-list"
import { AutoAlerts } from "@/features/insight/components/auto-alerts"
import { WatchList } from "@/features/insight/components/watch-list"
import { getAlerts, getWatches } from "@/features/insight/queries"
import { isWatched } from "@/features/insight/schemas"
import { alertSources, avgPrice } from "@/features/insight/sources"

import { NoHome } from "../../../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.alerts")
  return { title: t("title") }
}

/**
 * The add button with what its sheet needs: each template's history and the home's devices. Read once per request
 * (React.cache), shared with the lists below.
 */
async function Add() {
  if (await isDemoViewer()) return null // a demo home is read-only
  const [devices, data, power, bill, bills, locale] = await Promise.all([
    getDevices(),
    getDashboard(),
    getPower(),
    getCurrentBill(),
    getBillHistory(),
    getLocale(),
  ])
  if (!devices || !data) return null
  const named = devices.filter((d) => d.type !== "other")
  // shortcut: one device read per named device for its run lengths; a bulk endpoint once homes have ~20+ devices.
  const details = await Promise.all(named.map((d) => getDevice(d.id)))
  const price = avgPrice(bill)
  return (
    <AddAlert
      sources={alertSources({
        days: data.days,
        bills: bills ?? [],
        power: power?.ranges.week ?? [],
        price,
        locale,
        billNow: bill?.amount_total ?? null,
        powerNow: data.live,
      })}
      devices={named.map((d, i) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        longest: details[i]?.days.map((day) => day.longest_min) ?? [],
        week: d.week_kwh,
      }))}
      price={price}
      save={saveWatchAction}
      setEvent={setDeviceEventAction}
    />
  )
}

/** What fired, newest first. */
async function Fired({ className }: { className?: string }) {
  const [alerts, watches, data, t, viewer] = await Promise.all([
    getAlerts(),
    getWatches(),
    getDashboard(),
    getTranslations("insight.page"),
    isDemoViewer(),
  ])
  if (!alerts || !data) return <NoHome />
  return (
    <AlertList
      title={t("fired")}
      alerts={alerts}
      now={data.now}
      onSeen={viewer ? undefined : acknowledgeAlertAction}
      onFeedback={viewer ? undefined : sendAlertFeedbackAction}
      // Only watches still listed below have a row to link to.
      mine={new Set((watches ?? []).filter(isWatched).map((w) => w.id))}
      className={className}
    />
  )
}

/** What is watched: the automatic alerts, then the ones set by the user or Wappi. */
async function Watched({ className }: { className?: string }) {
  const [watches, devices, bill, settings, t] = await Promise.all([
    getWatches(),
    getDevices(),
    getCurrentBill(),
    getHomeSettings(),
    getTranslations("insight.page"),
  ])
  if (!watches || !devices) return null
  return (
    <Tile
      title={t("watched")}
      description={t("watchedHint")}
      className={className}
    >
      <div className="flex flex-col gap-4">
        {settings ? (
          <AutoAlerts
            preferences={settings.preferences}
            save={saveHomeSettingsAction}
          />
        ) : null}
        <WatchList
          watches={watches}
          devices={devices.map((d) => ({
            id: d.id,
            name: d.name,
            type: d.type,
          }))}
          price={avgPrice(bill)}
          cancel={cancelWatchAction}
          add={<Add />}
        />
      </div>
    </Tile>
  )
}

// What happened 7 | what is watched 5 on lg; stacked in that order below. Adding is the head's button.
export default function AlertsPage() {
  const t = useTranslations("layout.alerts")
  return (
    <>
      <PageHead
        title={t("title")}
        action={
          <Suspense
            fallback={<Skeleton shape="block" width={136} height={36} />}
          >
            <Add />
          </Suspense>
        }
      >
        {t("description")}
      </PageHead>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <Suspense
          fallback={
            <TileSkeleton height={63} mobile={76} className="lg:col-span-7" />
          }
        >
          <Fired className="lg:col-span-7" />
        </Suspense>
        <Suspense
          fallback={
            <TileSkeleton height={512} mobile={535} className="lg:col-span-5" />
          }
        >
          <Watched className="lg:col-span-5" />
        </Suspense>
      </div>
    </>
  )
}
