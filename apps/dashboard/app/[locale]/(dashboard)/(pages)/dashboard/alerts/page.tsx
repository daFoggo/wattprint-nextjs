import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { Tile } from "@/components/shared/tile"
import { TileSkeleton } from "@/components/shared/tile-skeleton"
import { getBillHistory, getCurrentBill } from "@/features/billing/queries"
import { getDashboard, getDevices, getPower } from "@/features/energy/queries"
import { saveHomeSettingsAction } from "@/features/home/actions"
import { AlertPreferences } from "@/features/home/components/alert-preferences"
import { getHomeSettings } from "@/features/home/queries"
import {
  cancelWatchAction,
  saveWatchAction,
  setDeviceEventAction,
} from "@/features/insight/actions"
import { AlertBuilder } from "@/features/insight/components/alert-builder"
import { DeviceAlertList } from "@/features/insight/components/device-alerts"
import { WatchList } from "@/features/insight/components/watch-list"
import { getWatches } from "@/features/insight/queries"
import { alertSources, avgPrice } from "@/features/insight/sources"

import { NoHome } from "../../../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.alerts")
  return { title: t("title") }
}

/**
 * Every alert setting in one place (Sense's goals and notifications): set one on its history, the devices'
 * on/off switches, the system's own alerts, then what is set. Read fresh: Wappi sets alerts too.
 */
async function Alerts() {
  const [watches, devices, data, power, bill, bills, settings, locale, t] =
    await Promise.all([
      getWatches(),
      getDevices(),
      getDashboard(),
      getPower(),
      getCurrentBill(),
      getBillHistory(),
      getHomeSettings(),
      getLocale(),
      getTranslations("insight"),
    ])
  if (!watches || !devices || !data) return <NoHome />
  const price = avgPrice(bill)
  const named = devices.map((d) => ({ id: d.id, name: d.name, type: d.type }))
  const sources = alertSources({
    days: data.days,
    bills: bills ?? [],
    power: power?.ranges.week ?? [],
    price,
    locale,
    billNow: bill?.amount_total ?? null,
    powerNow: data.live,
  })
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <Tile
        title={t("builder.title")}
        description={t("builder.hint")}
        className="lg:col-span-12"
      >
        <AlertBuilder sources={sources} price={price} save={saveWatchAction} />
      </Tile>
      <Tile title={t("watches.title")} className="lg:col-span-7 lg:row-span-2">
        <WatchList
          watches={watches}
          devices={named}
          price={price}
          cancel={cancelWatchAction}
        />
      </Tile>
      <section id="devices" className="scroll-mt-24 lg:col-span-5">
        <Tile title={t("devices.title")} description={t("devices.hint")}>
          <DeviceAlertList
            devices={named}
            watches={watches}
            setEvent={setDeviceEventAction}
          />
        </Tile>
      </section>
      {settings ? (
        <div className="lg:col-span-5">
          <AlertPreferences
            preferences={settings.preferences}
            action={saveHomeSettingsAction}
          />
        </div>
      ) : null}
    </div>
  )
}

export default function AlertsPage() {
  const t = useTranslations("layout.alerts")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <Suspense fallback={<TileSkeleton height={520} />}>
        <Alerts />
      </Suspense>
    </>
  )
}
