import {
  IconDevices,
  IconMessageCircle,
  IconReceipt,
} from "@tabler/icons-react"
import Image from "next/image"
import { useTranslations } from "next-intl"

import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"
import { LocaleSwitch } from "@/components/shared/locale-switch"
import { Stagger } from "@/components/shared/stagger"
import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { useLandingHref } from "@/lib/use-landing-href"

// The landing page lives in apps/web, another origin: a plain `<a>`, not `next/link`.

const POINTS = [
  ["devices", IconDevices],
  ["bill", IconReceipt],
  ["wappi", IconMessageCircle],
] as const

/**
 * Left rail from lg, in the landing's colours: a forest plate (`brand-field`, globals.css) with the wordmark, the
 * pitch, three things the app does, and a real capture of the dashboard bleeding off the bottom right. Hidden below lg.
 */
export function AuthAside({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const t = useTranslations("auth.rail")
  const landing = useLandingHref()
  return (
    <aside className="hidden lg:sticky lg:top-0 lg:col-span-6 lg:flex lg:h-svh lg:flex-col xl:col-span-7">
      <div className="relative flex flex-1 flex-col overflow-hidden bg-brand-field px-12 text-brand-field-foreground">
        <div className="flex h-24 shrink-0 items-center">
          <a href={landing()}>
            <AppLogo size="lg" />
          </a>
        </div>
        <div className="flex max-w-xl flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-4xl leading-tight font-medium text-balance">
              {title}
            </p>
            <p className="text-lg leading-relaxed text-brand-field-muted">
              {children}
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {POINTS.map(([key, PointIcon]) => (
              <li key={key} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <PointIcon aria-hidden className="size-4" />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        {/* The real app rising out of the forest like the landing's hero stage: rounded on top, the same inset on
            both sides, cut by the bottom of the screen. The rail runs edge to edge, so no edge of the capture meets
            the page behind it (where its own page colour used to swallow the plate's corner). */}
        <div className="mt-12 min-h-0 flex-1 overflow-hidden rounded-t-2xl">
          <Image
            src="/auth/overview-light.webp"
            alt={t("shotAlt")}
            width={2880}
            height={1800}
            sizes="(min-width: 1280px) 50vw, 45vw"
            className="size-full object-cover object-left-top dark:hidden"
          />
          <Image
            src="/auth/overview-dark.webp"
            alt={t("shotAlt")}
            width={2880}
            height={1800}
            sizes="(min-width: 1280px) 50vw, 45vw"
            className="hidden size-full object-cover object-left-top dark:block"
          />
        </div>
      </div>
    </aside>
  )
}

/** Form column: header, centered body, terms footer. */
export function AuthMain({ children }: { children: React.ReactNode }) {
  const t = useTranslations("auth.frame")
  const landing = useLandingHref()
  const link = (path: string) => (chunks: React.ReactNode) => (
    <a
      href={landing(path)}
      className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
      target="_blank"
      rel="noreferrer"
    >
      {chunks}
    </a>
  )
  return (
    <main className="flex min-h-svh flex-col px-9 max-sm:px-6 lg:col-span-6 xl:col-span-5">
      {children}
      <p className="py-8 text-center text-sm text-balance text-muted-foreground">
        {t.rich("terms", { terms: link("/terms"), privacy: link("/privacy") })}
      </p>
    </main>
  )
}

/**
 * Top bar of the form column. Below lg (rail hidden) the logo links home; from lg a "Go to home page" link
 * takes its place, since the rail already carries the logo.
 */
export function AuthHeader() {
  const t = useTranslations("auth.frame")
  const landing = useLandingHref()
  return (
    <header className="flex h-24 items-center justify-between gap-4 max-sm:h-18">
      <a href={landing()} className="lg:hidden">
        <AppLogo size="md" />
      </a>
      <a
        href={landing()}
        className="hidden text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground lg:block"
      >
        {t("goHome")}
      </a>
      <div className="flex items-center gap-2">
        <LocaleSwitch size="md" />
        <ThemeToggle />
      </div>
    </header>
  )
}

/** Centered column holding the heading and the form. */
export function AuthBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col justify-center py-12 max-sm:py-8">
      <Stagger className="mx-auto flex w-full max-w-sm flex-col gap-8">
        {children}
      </Stagger>
    </div>
  )
}

export function AuthHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow ? (
        <span className="text-sm text-muted-foreground">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="text-3xl leading-tight font-medium md:text-4xl">
        {title}
      </h1>
      <p className="text-muted-foreground">{children}</p>
    </div>
  )
}
