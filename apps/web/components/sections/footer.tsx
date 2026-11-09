import Link from "next/link"

import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"

import { GUTTER } from "@/config/layout"
import { REPO_URL } from "@/config/site"

const LINK = "text-base font-medium transition-colors hover:text-muted-foreground"

export function Footer() {
  return (
    <footer className={`${GUTTER} flex flex-wrap items-center gap-x-8 gap-y-4 px-9 py-8`}>
      <span className="text-sm text-muted-foreground">
        © 2026 Next Mono Base · MIT License
      </span>
      <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-2 sm:ml-auto">
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={LINK}>
          GitHub
        </a>
        <Link href="/terms" className={LINK}>
          Terms
        </Link>
        <Link href="/privacy" className={LINK}>
          Privacy
        </Link>
      </nav>
      <ThemeToggle />
    </footer>
  )
}
