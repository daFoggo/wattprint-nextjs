"use server"

import { refresh } from "next/cache"
import { getLocale, getTranslations } from "next-intl/server"
import { z } from "zod"

import { requirePermission } from "@/lib/dal"
import { isExpectedDataError } from "@/lib/errors"

import {
  formatFigure,
  METRIC_UNIT,
  VERDICTS,
  WatchCreateSchema,
} from "./schemas"
import {
  acknowledgeAlert,
  cancelWatch,
  createWatch,
  fetchWatches,
  sendAlertFeedback,
} from "./server"

/** Marks an alert seen. Already gone (resolved and pruned, another home's): nothing to do. */
export async function acknowledgeAlertAction(id: string) {
  const { accessToken } = await requirePermission("account:view")
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return
  try {
    await acknowledgeAlert(accessToken, parsed.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
  }
}

/** A member's verdict on a model alert; an alert already gone (another home's, pruned) is nothing to do. */
export async function sendAlertFeedbackAction(id: string, verdict: string) {
  const { accessToken } = await requirePermission("account:view")
  const parsed = z
    .object({ id: z.uuid(), verdict: z.enum(VERDICTS) })
    .safeParse({ id, verdict })
  if (!parsed.success) return
  try {
    await sendAlertFeedback(accessToken, parsed.data.id, parsed.data.verdict)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
  }
  refresh()
}

const REFUSALS = [
  "already_crossed",
  "too_many",
  "no_tariff",
  "no_device",
  "ends_in_past",
  "bad_device",
] as const
type Refusal = (typeof REFUSALS)[number]
export type SaveResult = { ok: true } | { ok: false; error: string }

/** Saves an alert set on the builder or a device tile: authorize, validate (the trust boundary), create. */
export async function saveWatchAction(input: unknown): Promise<SaveResult> {
  const { accessToken } = await requirePermission("account:view")
  const [t, locale] = await Promise.all([
    getTranslations("insight.watches"),
    getLocale(),
  ])
  const parsed = WatchCreateSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: t("errors.invalid") }
  try {
    await createWatch(accessToken, parsed.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
    const body = (error.body ?? {}) as { code?: string; value_now?: string }
    const code = REFUSALS.includes(body.code as Refusal)
      ? (body.code as Refusal)
      : "invalid"
    const value = formatFigure(
      Number(body.value_now ?? 0),
      METRIC_UNIT[parsed.data.metric],
      locale
    )
    return { ok: false, error: t(`errors.${code}`, { value }) }
  }
  refresh()
  return { ok: true }
}

/**
 * A device's "tell me when it turns on/off" switch: cancel the active one, then set it again when on, so a
 * double flip never leaves two.
 */
export async function setDeviceEventAction(
  deviceId: string,
  event: "device_on" | "device_off",
  on: boolean,
  label: string
): Promise<SaveResult> {
  const { accessToken } = await requirePermission("account:view")
  const t = await getTranslations("insight.watches")
  const id = z.uuid().parse(deviceId)
  try {
    const current = (await fetchWatches(accessToken)).filter(
      (w) => w.status === "active" && w.metric === event && w.device_id === id
    )
    for (const w of current) await cancelWatch(accessToken, w.id)
    if (on)
      await createWatch(
        accessToken,
        WatchCreateSchema.parse({
          metric: event,
          op: "gt",
          threshold: 0,
          label,
          device_id: id,
          repeat: true,
        })
      )
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
    const code = (error.body as { code?: string } | undefined)?.code
    return {
      ok: false,
      error: t(
        `errors.${REFUSALS.includes(code as Refusal) ? (code as Refusal) : "invalid"}`,
        { value: "" }
      ),
    }
  } finally {
    refresh()
  }
  return { ok: true }
}

/** Stops an alert. Already gone (another tab cancelled it, it fired): nothing to do. */
export async function cancelWatchAction(id: string) {
  const { accessToken } = await requirePermission("account:view")
  const parsed = z.uuid().safeParse(id)
  if (!parsed.success) return
  try {
    await cancelWatch(accessToken, parsed.data)
  } catch (error) {
    if (!isExpectedDataError(error)) throw error
  }
  refresh()
}
