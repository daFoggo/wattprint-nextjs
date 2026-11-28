"use client"

import { useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import { DatePicker } from "@workspace/ui/components/hairline/date-picker"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { eraseHistoryAction } from "../actions"
import { DeleteRow } from "./delete-row"

/** The electricity history, before a chosen day or all of it. Shown only to who may erase it. */
export function EraseHistory() {
  const t = useTranslations("privacy.history")
  const locale = useLocale()
  const format = useFormatter()
  const [scope, setScope] = useState("before")
  const [day, setDay] = useState<string | null>(null)
  const all = scope === "all"
  // Today in Vietnam. A later date would erase everything while naming a day.
  const [today] = useState(() =>
    new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
  )
  return (
    <DeleteRow
      title={t("title")}
      hint={t("hint")}
      open={t("open")}
      question={
        all || !day
          ? t("questionAll")
          : t("questionBefore", {
              date: format.dateTime(new Date(day), { dateStyle: "medium" }),
            })
      }
      loses={[t("readings"), t("bills"), t("stays"), t("sent")]}
      disabled={!all && !day}
      onConfirm={async () => {
        const result = await eraseHistoryAction(all ? null : day)
        if (!result.ok) return result.error
      }}
      controls={
        <>
          <SegmentedControl
            label={t("scope")}
            size="sm"
            value={scope}
            onValueChange={setScope}
            options={[
              { value: "before", label: t("before") },
              { value: "all", label: t("all") },
            ]}
          />
          {all ? null : (
            <DatePicker
              label={t("date")}
              placeholder={t("datePlaceholder")}
              locale={locale}
              value={day}
              max={today}
              onValueChange={setDay}
              className="w-56"
            />
          )}
        </>
      }
    />
  )
}
