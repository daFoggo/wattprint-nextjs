"use client"

import { useTranslations } from "next-intl"

import { Tile } from "@/components/shared/tile"
import { deleteAccountAction } from "@/features/auth/actions"
import { DeleteAccount } from "@/features/auth/components/delete-account"
import { useCopilot } from "@/features/copilot/components/copilot-provider"
import { DeleteRow } from "@/features/privacy/components/delete-row"
import { EraseHistory } from "@/features/privacy/components/erase-history"

/** Deleting: the home's electricity history (its owner), my chats, my account (the account menu's own flow). */
export function DeleteData({ canErase }: { canErase: boolean }) {
  const t = useTranslations("privacy")
  const { deleteAll } = useCopilot()
  return (
    <Tile title={t("delete.title")} description={t("delete.description")}>
      <div className="flex flex-col divide-y">
        {canErase ? (
          <EraseHistory />
        ) : (
          <div className="flex flex-col gap-0.5 pb-4">
            <h3 className="text-sm font-medium">{t("history.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("history.cannot")}
            </p>
          </div>
        )}
        <DeleteRow
          title={t("chats.title")}
          hint={t("chats.hint")}
          open={t("chats.open")}
          question={t("chats.question")}
          loses={[t("chats.loses"), t("chats.sent")]}
          onConfirm={deleteAll}
        />
        <DeleteRow
          title={t("account.title")}
          hint={t("account.hint")}
          open={t("account.open")}
          question={t("account.question")}
          loses={[t("account.loses"), t("account.home"), t("account.sent")]}
        >
          <DeleteAccount action={deleteAccountAction} />
        </DeleteRow>
      </div>
    </Tile>
  )
}
