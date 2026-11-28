import { useFormatter, useTranslations } from "next-intl"

import { Tile } from "@/components/shared/tile"

import type { Privacy } from "../schemas"

/** The four levels of detail as steps, finest first: how long each is kept and the home's oldest day in it. */
export function Kept({ privacy }: { privacy: Privacy }) {
  const t = useTranslations("privacy.kept")
  const format = useFormatter()
  const date = (day: string) =>
    format.dateTime(new Date(day), { dateStyle: "medium" })
  return (
    <Tile title={t("title")} description={t("description")}>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {privacy.levels.map((l) => (
          <li
            key={l.level}
            className="flex flex-col gap-1 rounded-xl border p-4"
          >
            <span className="text-xs text-muted-foreground">
              {t(`levels.${l.level}`)}
            </span>
            <span className="text-lg font-medium">
              {l.keep_days === null
                ? t("forever")
                : t("days", { days: l.keep_days })}
            </span>
            <span className="text-xs text-muted-foreground">
              {l.oldest ? t("oldest", { date: date(l.oldest) }) : t("none")}
            </span>
          </li>
        ))}
      </ul>
      {privacy.erased_before ? (
        <p className="text-xs text-muted-foreground">
          {t("erased", { date: date(privacy.erased_before) })}
        </p>
      ) : null}
    </Tile>
  )
}
