"use client"

import { useState } from "react"
import { IconDoorExit, IconTrash } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Avatar } from "@workspace/ui/components/hairline/avatar"
import { Button } from "@workspace/ui/components/hairline/button"
import { ConfirmAction } from "@workspace/ui/components/hairline/confirm-action"
import { CopyButton } from "@workspace/ui/components/hairline/copy-button"
import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import { Tile } from "@/components/shared/tile"

import {
  inviteAction,
  leaveHomeAction,
  removeMemberAction,
  setMemberDetailAction,
} from "../actions"
import type { Member } from "../schemas"

/**
 * Who sees the home: the owner invites, sets how finely each member sees and removes them; a member can leave.
 * A demo visitor has no household (`members` null): `children` then holds the way into a real one.
 */
export function Members({
  members,
  role,
  children,
}: {
  members: Member[] | null
  role: "owner" | "member" | "viewer"
  children?: React.ReactNode
}) {
  const t = useTranslations("privacy.members")
  const failed = useTranslations("privacy.refused")
  const [code, setCode] = useState<string>()
  const [error, setError] = useState<string>()
  const [inviting, setInviting] = useState(false)
  const owner = role === "owner"

  /** Shows a refusal's words; true when it went through. */
  const run = async <T extends { ok: boolean; error?: string }>(
    action: () => Promise<T>
  ) => {
    setError(undefined)
    const result = await action().catch((failure: unknown) => {
      console.error(failure)
      return { ok: false, error: failed("other") } as T
    })
    if (!result.ok) setError(result.error)
    return result
  }
  /** For ConfirmAction: a thrown error makes its button offer to try again. */
  const confirm = async (action: () => ReturnType<typeof leaveHomeAction>) => {
    const result = await run(action)
    if (!result.ok) throw new Error(result.error)
  }

  const invite = async () => {
    setInviting(true)
    const result = await run(inviteAction)
    if (result.ok && "code" in result) setCode(result.code)
    setInviting(false)
  }

  return (
    <Tile
      title={t("title")}
      description={t("description")}
      action={
        owner ? (
          <Button
            variant="outline"
            size="sm"
            disabled={inviting}
            onClick={invite}
          >
            {t("invite")}
          </Button>
        ) : null
      }
    >
      {error ? <Alert tone="warning" title={error} /> : null}
      {code ? (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-xl border p-4"
        >
          <span className="text-xs text-muted-foreground">{t("code")}</span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-lg font-medium tracking-widest">
              {code}
            </span>
            <CopyButton
              text={code}
              label={t("copy")}
              copiedLabel={t("copied")}
              errorLabel={t("copyFailed")}
            />
          </span>
          <span className="text-xs text-muted-foreground">{t("codeHint")}</span>
        </div>
      ) : null}
      {members ? (
        <ul className="flex flex-col divide-y">
          {members.map((m) => {
            const name = m.name || m.email || t("unnamed")
            return (
              <li
                key={m.user_id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <Avatar name={name} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t(m.role)}
                    {m.email && m.email !== name ? ` · ${m.email}` : ""}
                  </span>
                </span>
                {owner && m.role === "member" ? (
                  <>
                    <SegmentedControl
                      label={t("level", { name })}
                      size="sm"
                      value={m.detail}
                      onValueChange={(next) =>
                        run(() =>
                          setMemberDetailAction(
                            m.user_id,
                            next as Member["detail"]
                          )
                        )
                      }
                      options={[
                        { value: "full", label: t("full") },
                        { value: "daily", label: t("daily") },
                      ]}
                    />
                    <ConfirmAction
                      icon={<IconTrash aria-hidden className="size-4" />}
                      label={t("remove", { name })}
                      labels={{
                        idle: t("removeConfirm"),
                        pending: t("removing"),
                        success: t("removed"),
                      }}
                      tone="danger"
                      onConfirm={() =>
                        confirm(() => removeMemberAction(m.user_id))
                      }
                    />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t(m.detail)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm">{t("visitor")}</p>
      )}
      {owner && members?.some((m) => m.role === "member") ? (
        <p className="text-xs text-muted-foreground">{t("removeLoses")}</p>
      ) : null}
      {role === "member" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-sm font-medium">{t("leave")}</h3>
            <p className="text-xs text-muted-foreground">{t("leaveLoses")}</p>
          </div>
          <ConfirmAction
            icon={<IconDoorExit aria-hidden className="size-4" />}
            label={t("leave")}
            labels={{
              idle: t("leaveConfirm"),
              pending: t("leaving"),
              success: t("left"),
            }}
            tone="danger"
            onConfirm={() => confirm(leaveHomeAction)}
          />
        </div>
      ) : null}
      {children}
    </Tile>
  )
}
