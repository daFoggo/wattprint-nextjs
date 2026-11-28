"use client"

import { useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import {
  DatePicker,
  parseDate,
} from "@workspace/ui/components/hairline/date-picker"
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
  const [badDate, setBadDate] = useState(false)
  // The picker keeps its own English error after its "Today" button: a fresh picker drops it.
  const [picker, setPicker] = useState(0)
  const all = scope === "all"
  // Today in Vietnam. A later date would erase everything while naming a day.
  const [today] = useState(() =>
    new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
  )
  // The picker keeps its value while the text is retyped, and words a bad date in English only: forget the day as
  // soon as the text changes, and say what is wrong in the page's language.
  const check = (field: EventTarget) => {
    if (!(field instanceof HTMLInputElement) || !field.value.trim()) return
    const parsed = parseDate(field.value, today)
    // A date the picker already settled reads as words it cannot parse back: only judge what was typed.
    if (!day) setBadDate(!parsed || parsed > today)
  }
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
      loses={[t("readings"), t("bills"), t("plans"), t("stays"), t("sent")]}
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
            <div
              onChange={() => {
                setDay(null)
                setBadDate(false)
              }}
              onBlur={(e) => check(e.target)}
              onKeyDown={(e) => {
                if (e.key === "Enter") check(e.target)
              }}
            >
              <DatePicker
                key={picker}
                label={t("date")}
                placeholder={t("datePlaceholder")}
                locale={locale}
                value={day}
                max={today}
                error={badDate ? t("dateInvalid") : undefined}
                onValueChange={(next) => {
                  setDay(next)
                  setBadDate(false)
                  if (badDate && next) setPicker((n) => n + 1)
                }}
                className="w-56"
              />
            </div>
          )}
        </>
      }
    >
      <a
        href="https://openrouter.ai/privacy"
        target="_blank"
        rel="noreferrer"
        className="self-start text-xs underline underline-offset-4 hover:text-muted-foreground"
      >
        {t("openrouter")}
      </a>
    </DeleteRow>
  )
}
