import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"
import { Stagger } from "@/components/shared/stagger"
import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { publicEnv } from "@/lib/env.public"

/** The landing page lives in apps/web, another origin: a plain `<a>`, not `next/link`. */
const LANDING_URL = publicEnv.NEXT_PUBLIC_LANDING_URL

/** Left rail from lg: wordmark, page-specific showcase centered, footer. Hidden below lg. */
export function AuthAside({ children }: { children: React.ReactNode }) {
  return (
    <aside className="hidden lg:sticky lg:top-0 lg:col-span-6 lg:flex lg:h-svh lg:flex-col lg:p-2 xl:col-span-7">
      {/* A section plate: set apart by its surface, not a rule (docs/design-system.md, Surfaces). */}
      <div className="flex flex-1 flex-col rounded-3xl bg-card px-7 text-foreground">
        <div className="relative flex h-24 shrink-0 items-center">
          <a href={LANDING_URL}>
            <AppLogo size="lg" />
          </a>
        </div>
        <div className="relative flex flex-1 flex-col justify-center">
          <div className="flex flex-col gap-8 text-foreground">{children}</div>
        </div>
        {/* Same height as the header so the showcase stays vertically centered. */}
        <div className="relative flex h-24 shrink-0 items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 WattPrint</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

/** Rail headline: title plus a one-line standfirst. */
export function AuthPitch({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <p className="text-3xl leading-tight font-medium text-balance md:text-4xl">
        {title}
      </p>
      <p className="text-lg leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

/** Form column: header, centered body, terms footer. */
export function AuthMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col px-9 max-sm:px-6 lg:col-span-6 xl:col-span-5">
      {children}
      <p className="py-8 text-center text-sm text-balance text-muted-foreground">
        By continuing, you agree to the{" "}
        <a
          href={`${LANDING_URL}/terms`}
          className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href={`${LANDING_URL}/privacy`}
          className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Privacy Policy
        </a>
        .
      </p>
    </main>
  )
}

/**
 * Top bar of the form column. Below lg (rail hidden) the logo links home; from lg a "Go to home page" link
 * takes its place, since the rail already carries the logo.
 */
export function AuthHeader() {
  return (
    <header className="flex h-24 items-center justify-between gap-4 max-sm:h-18">
      <a href={LANDING_URL} className="lg:hidden">
        <AppLogo size="md" />
      </a>
      <a
        href={LANDING_URL}
        className="hidden text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground lg:block"
      >
        Go to home page
      </a>
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
