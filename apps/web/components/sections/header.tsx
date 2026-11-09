import Link from "next/link"

import { buttonVariants } from "@workspace/ui/components/button-variants"
import { AppLogo } from "@workspace/ui-patterns/app-logo"

import { DASHBOARD_HREF, REPO_URL } from "@/config/site"

const CELL =
  "flex items-center border-l px-6 text-base font-medium transition-colors hover:bg-accent"

/** Full-bleed 56px bar cut into hairline cells: logo | docs, GitHub, dashboard. */
export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-stretch">
        <Link href="/" className="flex items-center border-r px-4">
          <AppLogo />
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-stretch">
          <a href="#docs" className={`${CELL} max-sm:hidden`}>
            Docs
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={`${CELL} max-sm:hidden`}
          >
            GitHub
          </a>
          <span className="flex items-center border-l px-3">
            <a
              href={DASHBOARD_HREF}
              className={buttonVariants({ size: "lg" })}
            >
              Open dashboard
            </a>
          </span>
        </nav>
      </div>
    </header>
  )
}
