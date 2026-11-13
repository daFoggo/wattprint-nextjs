import type { Metadata } from "next"
import { Suspense } from "react"
import { useTranslations } from "next-intl"
import { getTranslations } from "next-intl/server"

import { PageHead } from "@/components/layout/page-head"
import { DeviceList } from "@/features/energy/components/device-list"
import { DeviceListSkeleton } from "@/features/energy/components/skeletons"
import { getCurrentBill } from "@/features/billing/queries"
import { getDashboard, getDevices } from "@/features/energy/queries"

import { NoHome } from "../../_components/no-home"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout.devices")
  return { title: t("title") }
}

/** Every device; without a home there is nothing to list. */
async function Devices() {
  void getDashboard() // the meter, alongside the bill
  const bill = await getCurrentBill()
  const devices = await getDevices(bill?.amount_total)
  if (!devices) return <NoHome />
  return <DeviceList devices={devices} />
}

export default function DevicesPage() {
  const t = useTranslations("layout.devices")
  return (
    <>
      <PageHead title={t("title")}>{t("description")}</PageHead>
      <Suspense fallback={<DeviceListSkeleton />}>
        <Devices />
      </Suspense>
    </>
  )
}
