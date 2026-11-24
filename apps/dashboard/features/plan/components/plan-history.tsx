import { IconChevronRight } from "@tabler/icons-react"
import { useLocale, useTranslations } from "next-intl"

import { Badge, type BadgeTone } from "@workspace/ui/components/hairline/badge"
import { EmptyState } from "@workspace/ui/components/hairline/empty-state"

import { Tile } from "@/components/shared/tile"
import { planPath } from "@/config/routes"
import { Link } from "@/i18n/navigation"

import { outcomeOf, type verdict } from "../math"
import type { PlanHistoryItem } from "../schemas"
import { at, formats } from "./plan-data"

export const TONE: Record<ReturnType<typeof verdict>, BadgeTone> = {
  early: "neutral",
  saving: "success",
  more: "warning",
}
/**
 * Finished plans as rows, newest first, each a link to its own page (`/dashboard/plan/<id>`): the history page's list.
 */
export function PlanHistory({
  history,
  title,
}: {
  history: PlanHistoryItem[]
  /** The history page names the count; its page head already says what the list is. */
  title?: string
}) {
  const t = useTranslations("plan.history")
  const f = formats(useLocale())
  const samples = history.some((p) => !p.mine)
  return (
    <Tile
      title={title ?? t("title")}
      description={samples ? t("demoNote") : t("description")}
    >
      {history.length ? (
        <ul className="flex flex-col divide-y divide-border">
          {history.map((p) => {
            const o = outcomeOf(p)
            return (
              <li key={p.id}>
                <Link
                  href={planPath(p.id)}
                  className="group -mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors duration-150 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm tabular-nums">
                      {t("span", {
                        from: f.date.format(at(p.start_on)),
                        to: f.dateYear.format(at(p.end_on)),
                      })}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {o.whole
                        ? t("whole")
                        : t("stoppedAfter", { n: o.ranDays })}
                      {p.mine ? null : (
                        <Badge size="sm" outline>
                          {t("sample")}
                        </Badge>
                      )}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {/* Words, not a sign: the meter on the plan's page counts a saving as +. */}
                    <span className="text-sm tabular-nums">
                      {t(
                        o.verdict === "early"
                          ? "near"
                          : o.saved > 0
                            ? "less"
                            : "more",
                        { kwh: f.kwh.format(Math.abs(o.saved)) }
                      )}
                    </span>
                    <Badge size="sm" tone={TONE[o.verdict]} dot>
                      {t(`verdict.${o.verdict}`)}
                    </Badge>
                  </span>
                  <IconChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          scene="inbox"
          title={t("emptyTitle")}
          description={t("empty")}
        />
      )}
    </Tile>
  )
}
