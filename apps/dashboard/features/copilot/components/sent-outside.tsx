"use client"

import { useLocale, useTranslations } from "next-intl"

import { Collapsible } from "@workspace/ui/components/hairline/collapsible"

import type { Sent } from "../schemas"
import { sentKey } from "../sent"

/** What left WattPrint for this answer, folded until asked for. */
export function SentOutside({ sent }: { sent: Sent }) {
  const t = useTranslations("copilot.sent")
  const locale = useLocale()
  type Key = Parameters<typeof t>[0]
  // An id this build has no words for is shown as it is: never hidden.
  const list = (group: "parties" | "kinds", ids: string[]) =>
    new Intl.ListFormat(locale, { type: "unit" }).format(
      ids.map((id) => {
        const key = `${group}.${sentKey(id)}` as Key
        return t.has(key) ? t(key) : id
      })
    )
  const rows = [
    [t("to"), list("parties", sent.parties)],
    [t("data"), list("kinds", sent.data)],
    ...(sent.detail ? [[t("detail"), t(`levels.${sent.detail}`)]] : []),
  ]
  return (
    <Collapsible
      placement="top"
      labels={{ closed: t("title"), open: t("title") }}
    >
      <dl className="flex flex-col gap-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Collapsible>
  )
}
