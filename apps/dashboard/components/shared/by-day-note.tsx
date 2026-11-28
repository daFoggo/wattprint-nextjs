import { useTranslations } from "next-intl"

import { cn } from "@workspace/ui/lib/utils"

/** In place of blocks a member who sees days only does not get (R4.3): one line saying why. */
export function ByDayNote({ className }: { className?: string }) {
  const t = useTranslations("layout.byDay")
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {t("hidden")}
    </p>
  )
}
