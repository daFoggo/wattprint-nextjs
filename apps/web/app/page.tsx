import Link from "next/link"

import { linkButton } from "@workspace/ui-patterns/link-button"

import { SiteHeader } from "@/components/site-header"
import { DASHBOARD_HREF } from "@/config/site"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-5 text-center">
        <h1 className="max-w-3xl text-5xl font-medium tracking-tight text-balance sm:text-6xl">
          Your energy dashboard
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Track your home&apos;s electricity use in one place.
        </p>
        <a href={DASHBOARD_HREF} className={linkButton()}>
          Open dashboard
        </a>
      </main>
      <footer className="flex justify-center gap-6 py-8 text-sm text-muted-foreground">
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
      </footer>
    </div>
  )
}
