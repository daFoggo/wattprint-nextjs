import { Link } from "@/i18n/navigation"

import { AppLogo } from "@workspace/ui-patterns/app-logo"
import { ThemeToggle } from "@workspace/ui-patterns/theme-toggle"

import { LocaleSwitch } from "./locale-switch"

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-334 items-center justify-between px-5">
      <Link href="/">
        <AppLogo />
      </Link>
      <div className="flex items-center gap-2">
        <LocaleSwitch />
        <ThemeToggle />
      </div>
    </header>
  )
}
