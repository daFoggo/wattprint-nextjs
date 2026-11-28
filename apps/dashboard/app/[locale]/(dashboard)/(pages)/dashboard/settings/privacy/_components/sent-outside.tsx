"use client"

import { useState } from "react"
import { useFormatter, useLocale, useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Button } from "@workspace/ui/components/hairline/button"
import { EmptyState } from "@workspace/ui/components/hairline/empty-state"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"
import { Switch } from "@workspace/ui/components/hairline/switch"

import { ResponsiveDialog } from "@/components/shared/responsive-dialog"
import { Tile } from "@/components/shared/tile"
import { useCopilot } from "@/features/copilot/components/copilot-provider"
import { sentKey } from "@/features/copilot/sent"
import { setAiDetailAction } from "@/features/privacy/actions"
import {
  groupOutbound,
  type AiDetail,
  type Outbound,
} from "@/features/privacy/schemas"

const PURPOSES = ["wappi", "voice", "email"] as const
type Purpose = (typeof PURPOSES)[number]

/**
 * What leaves WattPrint: one switch per service with what it sends and to whom (the consent invite's own words),
 * how fine Wappi's numbers are, and the last 30 days' log. Switches go through the chat's provider, so Wappi knows
 * at once.
 */
export function SentOutside({
  consents,
  detail,
  owner,
  outbound,
}: {
  consents: { purpose: Purpose; granted: boolean }[]
  detail: AiDetail
  owner: boolean
  outbound: Outbound
}) {
  const t = useTranslations("privacy.outside")
  const tConsent = useTranslations("copilot.consent")
  const chat = useCopilot()
  const [saved, setSaved] = useState<Partial<Record<Purpose, boolean>>>({})
  const [level, setLevel] = useState(detail)
  const [error, setError] = useState<string>()

  const granted = (p: Purpose) =>
    chat.consents?.[p] ??
    saved[p] ??
    !!consents.find((c) => c.purpose === p)?.granted

  const toggle = (p: Purpose, next: boolean) => {
    setError(undefined)
    // Turning an AI service on goes through the same invite as in the chat: it saves on "agree".
    const keep = () => setSaved((all) => ({ ...all, [p]: next }))
    if (next && p !== "email") return chat.askConsent(p, keep)
    return chat.saveConsent(p, next).then(keep, (failure: unknown) => {
      console.error(failure)
      setError(tConsent("failed"))
      throw failure // the switch goes back
    })
  }

  const choose = async (next: string) => {
    const before = level
    setError(undefined)
    setLevel(next as AiDetail)
    const result = await setAiDetailAction(next as AiDetail).catch(
      (failure: unknown) => {
        console.error(failure)
        return { ok: false as const, error: tConsent("failed") }
      }
    )
    if (!result.ok) {
      setLevel(before)
      setError(result.error)
    }
  }

  const words = (p: Purpose) =>
    p === "email"
      ? {
          what: t("email.what"),
          to: t("email.to"),
          where: t("email.where"),
        }
      : {
          what: tConsent(`${p}.what`),
          to: tConsent(`${p}.to`),
          where: tConsent(`${p}.where`),
        }

  return (
    <Tile
      title={t("title")}
      description={t("description")}
      action={<OutboundLog rows={outbound} />}
    >
      {error ? <Alert tone="warning" title={error} /> : null}
      <ul className="flex flex-col divide-y">
        {PURPOSES.map((p) => (
          <li key={p} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <h3 id={`consent-${p}`} className="text-sm font-medium">
                {t(`${p}.name`)}
              </h3>
              <Switch
                aria-labelledby={`consent-${p}`}
                checked={granted(p)}
                onCheckedChange={(next) => toggle(p, next)}
              />
            </div>
            <dl className="grid max-w-2xl gap-1 text-xs">
              <dt className="text-muted-foreground">
                {tConsent("labels.what")}
              </dt>
              <dd>{words(p).what}</dd>
              <dt className="text-muted-foreground">{tConsent("labels.to")}</dt>
              <dd>{words(p).to}</dd>
              <dt className="text-muted-foreground">
                {tConsent("labels.where")}
              </dt>
              <dd>{words(p).where}</dd>
            </dl>
            {p === "wappi" ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {t("level")}
                </span>
                {owner ? (
                  <SegmentedControl
                    label={t("level")}
                    size="sm"
                    value={level}
                    onValueChange={choose}
                    options={[
                      { value: "hourly", label: t("hourly") },
                      { value: "daily", label: t("daily") },
                    ]}
                  />
                ) : (
                  <span className="text-xs">
                    {t(level)}. {t("ownerOnly")}
                  </span>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Tile>
  )
}

/** The 30-day log, behind a button: one line per day, receiver and kind of data. */
function OutboundLog({ rows }: { rows: Outbound }) {
  const t = useTranslations("privacy.log")
  const tSent = useTranslations("copilot.sent")
  const locale = useLocale()
  const format = useFormatter()
  const [open, setOpen] = useState(false)
  type Key = Parameters<typeof tSent>[0]
  // An id this build has no words for is shown as it is: never hidden.
  const word = (group: "parties" | "kinds", id: string) => {
    const key = `${group}.${sentKey(id)}` as Key
    return tSent.has(key) ? tSent(key) : id
  }
  const groups = groupOutbound(rows)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("open")}
      </Button>
      <ResponsiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        description={t("description")}
      >
        {groups.length ? (
          <ul className="flex flex-col divide-y">
            {groups.map((g) => (
              <li
                key={JSON.stringify([g.day, g.party, g.data, g.detail])}
                className="flex flex-col gap-0.5 py-2"
              >
                <span className="flex justify-between gap-3 text-sm">
                  <span>{word("parties", g.party)}</span>
                  <span className="text-muted-foreground">
                    {format.dateTime(new Date(g.day), { dateStyle: "medium" })}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Intl.ListFormat(locale, { type: "unit" }).format(
                    g.data.map((id) => word("kinds", id))
                  )}
                  {g.detail === "daily" || g.detail === "hourly"
                    ? `. ${tSent(`levels.${g.detail}`)}`
                    : null}
                  {`. ${t("times", { count: g.count })}`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("empty")} />
        )}
      </ResponsiveDialog>
    </>
  )
}
