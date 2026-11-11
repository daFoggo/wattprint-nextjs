import Link from "next/link"

import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-334 items-center justify-between px-5">
      <Link href="/">
        <AppLogo />
      </Link>
      <ThemeToggle />
    </header>
  )
}
