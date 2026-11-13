import { AppLogo } from "@workspace/ui-patterns/app-logo"

import type { I18n } from "../i18n"
import { LocaleSwitch } from "./locale-switch"

/**
 * The dashboard's sign-in frame (apps/dashboard/app/[locale]/(auth)/_components/auth-frame.tsx), rebuilt for Keycloak's
 * pages so leaving the app for the email form keeps the same layout: a rail with the pitch from lg, the form column.
 * No theme toggle: Keycloak is another origin, so the app's choice can't be read; it stays dark, the app's default.
 */
export function Frame({
  i18n,
  landingUrl,
  children,
}: {
  i18n: I18n
  landingUrl: string
  children: React.ReactNode
}) {
  const { msg } = i18n
  const link = (path: string, label: React.ReactNode) => (
    <a
      href={`${landingUrl}${path}`}
      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  )
  return (
    <div className="grid min-h-svh grid-cols-1 bg-background text-foreground lg:grid-cols-12">
      <aside className="hidden lg:sticky lg:top-0 lg:col-span-6 lg:flex lg:h-svh lg:flex-col lg:p-2 xl:col-span-7">
        <div className="flex flex-1 flex-col rounded-3xl bg-card px-7">
          <div className="flex h-24 shrink-0 items-center">
            <a href={landingUrl}>
              <AppLogo size="lg" />
            </a>
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="flex max-w-xl flex-col gap-3">
              <p className="text-3xl leading-tight font-medium text-balance md:text-4xl">
                {msg("pitchTitle")}
              </p>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {msg("pitchBody")}
              </p>
            </div>
          </div>
          <div className="flex h-24 shrink-0 items-center text-sm text-muted-foreground">
            © 2026 WattPrint
          </div>
        </div>
      </aside>
      {/* From lg the column is one screen tall: header and footer stay put, only the form scrolls if it must. */}
      <main className="flex min-h-svh flex-col px-9 max-sm:px-6 lg:col-span-6 lg:h-svh xl:col-span-5">
        <header className="flex h-24 shrink-0 items-center justify-between gap-4 max-sm:h-18">
          <a href={landingUrl} className="lg:hidden">
            <AppLogo size="md" />
          </a>
          <a
            href={landingUrl}
            className="hidden text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground lg:block"
          >
            {msg("goHome")}
          </a>
          <LocaleSwitch i18n={i18n} />
        </header>
        <div className="flex flex-1 flex-col py-8 lg:min-h-0 lg:overflow-y-auto">
          <div className="m-auto flex w-full max-w-sm flex-col gap-8">
            {children}
          </div>
        </div>
        <p className="shrink-0 py-8 text-center text-sm text-balance text-muted-foreground">
          {msg("termsLead")} {link("/terms", msg("termsOfService"))}{" "}
          {msg("termsAnd")} {link("/privacy", msg("privacyPolicy"))}.
        </p>
      </main>
    </div>
  )
}

/** Page title plus a one-line standfirst, as the dashboard's AuthHeading. */
export function Heading({
  title,
  children,
}: {
  title: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl leading-tight font-medium md:text-4xl">
        {title}
      </h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </div>
  )
}
