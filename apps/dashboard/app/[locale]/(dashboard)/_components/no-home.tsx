import { getTranslations } from "next-intl/server"

import { EmptyState } from "@workspace/ui/components/hairline/empty-state"

import { viewDemoHomeAction } from "@/features/auth/actions"
import { DemoHomePicker } from "@/features/auth/components/demo-home-picker"
import { getDemoHomes } from "@/features/auth/queries"

/**
 * In place of a page's tiles while the account belongs to no home: they would describe a home it does not have.
 * A new account can view a demo home read-only from here.
 */
export async function NoHome() {
  const [t, demo, homes] = await Promise.all([
    getTranslations("layout.overview"),
    getTranslations("auth.demo"),
    getDemoHomes(),
  ])
  return (
    <section className="flex flex-col gap-8 rounded-3xl bg-card p-6 lg:col-span-12">
      <EmptyState
        scene="inbox"
        title={t("noHomeTitle")}
        description={t("noHomeDescription")}
      />
      {homes.length ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-medium">{demo("pickTitle")}</h2>
            <p className="text-sm text-muted-foreground">{demo("pickHint")}</p>
          </div>
          <DemoHomePicker homes={homes} action={viewDemoHomeAction} />
        </div>
      ) : null}
    </section>
  )
}
