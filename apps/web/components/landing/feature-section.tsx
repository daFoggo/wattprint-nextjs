import {
  IconBell,
  IconChartBar,
  IconDevices,
  IconLayoutDashboard,
  IconMessageCircle,
  IconPigMoney,
  IconReceipt,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Tabs } from "@workspace/ui/components/hairline/tabs"

import { ProductShot } from "./product-shot"
import { SectionHead } from "./section-head"

function Panel({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-8 pt-8 lg:grid-cols-12 lg:items-center">
      <div className="flex flex-col gap-3 lg:col-span-4">
        <h3 className="text-lp-lead text-lp-ink font-medium">{title}</h3>
        <p className="text-lp-body text-lp-muted">{body}</p>
      </div>
      <div className="border-lp-line aspect-16/10 overflow-hidden rounded-2xl border lg:col-span-8">
        {children}
      </div>
    </div>
  )
}

/** The dashboard sidebar's icons (apps/dashboard/config/navigation.ts), so a tab reads like the page it shows; Wappi has no sidebar icon. */
const ICONS = {
  dashboard: IconLayoutDashboard,
  statistics: IconChartBar,
  devices: IconDevices,
  alerts: IconBell,
  plan: IconPigMoney,
  bill: IconReceipt,
  copilot: IconMessageCircle,
} as const

/** The dashboard's pages and Wappi as Hairline pill tabs with the sidebar's icons, in its order; every panel is a capture. */
export function FeatureSection() {
  const t = useTranslations("landing")
  const sizes = "(min-width: 1024px) 760px, 92vw"
  const copy = {
    dashboard: {
      title: t("tabs.overviewTitle"),
      body: t("tabs.overviewBody"),
      alt: t("tabs.overviewAlt"),
    },
    statistics: {
      title: t("tabs.statsTitle"),
      body: t("tabs.statsBody"),
      alt: t("tabs.statsAlt"),
    },
    devices: {
      title: t("features.steps.devices.title"),
      body: t("features.steps.devices.body"),
      alt: t("features.steps.devices.alt"),
    },
    alerts: {
      title: t("features.steps.alerts.title"),
      body: t("features.steps.alerts.body"),
      alt: t("features.steps.alerts.alt"),
    },
    plan: {
      title: t("features.steps.plan.title"),
      body: t("features.steps.plan.body"),
      alt: t("tabs.planAlt"),
    },
    bill: {
      title: t("features.steps.bill.title"),
      body: t("features.steps.bill.body"),
      alt: t("features.steps.bill.alt"),
    },
    copilot: {
      title: t("tabs.wappiTitle"),
      body: t("tabs.wappiBody"),
      alt: t("tabs.wappiAlt"),
    },
  } as const
  const pages = [
    ["dashboard", t("tabs.overview")],
    ["statistics", t("tabs.statistics")],
    ["devices", t("tabs.devices")],
    ["alerts", t("tabs.alerts")],
    ["plan", t("tabs.plan")],
    ["bill", t("tabs.bill")],
    ["copilot", t("tabs.wappi")],
  ] as const
  return (
    <section
      aria-labelledby="product"
      className="max-w-lp px-lp-gutter mx-auto flex w-full flex-col gap-10"
    >
      <SectionHead
        id="product"
        title={t("tabs.title")}
        muted={t("tabs.muted")}
        body={t("tabs.body")}
      />
      <Tabs
        label={t("tabs.label")}
        variant="pills"
        defaultValue="dashboard"
        items={pages.map(([name, label]) => {
          const TabIcon = ICONS[name]
          return {
            value: name,
            label,
            icon: <TabIcon aria-hidden size={16} stroke={1.75} />,
            content: (
              <Panel title={copy[name].title} body={copy[name].body}>
                <ProductShot name={name} alt={copy[name].alt} sizes={sizes} />
              </Panel>
            ),
          }
        })}
      />
    </section>
  )
}
