import { getTranslations } from "next-intl/server"

import { viewDemoHomeAction } from "@/features/auth/actions"
import { DemoSwitch } from "@/features/auth/components/demo-switch"
import { getDemoHomes } from "@/features/auth/queries"
import { getHome } from "@/features/home/queries"

/** A demo viewer is told, on every page, that the home is read-only, and can move to another demo home. */
export async function DemoViewer() {
  const home = await getHome()
  if (home?.role !== "viewer") return null
  const [t, homes] = await Promise.all([
    getTranslations("auth.demo"),
    getDemoHomes(),
  ])
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
      <p className="text-muted-foreground">
        {t("viewing", { name: home.name })}
      </p>
      {homes.length > 1 ? (
        <DemoSwitch homes={homes} action={viewDemoHomeAction} />
      ) : null}
    </div>
  )
}
