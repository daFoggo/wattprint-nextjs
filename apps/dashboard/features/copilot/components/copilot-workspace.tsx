"use client"

import { startTransition, useEffect, useSyncExternalStore } from "react"
import { IconArrowsMinimize, IconHistory, IconPlus } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { ChatHistory } from "@workspace/ui/components/hairline/chat-history"
import { Sheet } from "@workspace/ui/components/hairline/sheet"

import { useRouter } from "@/i18n/navigation"

import { ConversationCard, IconAction } from "./copilot-panel"
import { useCopilot, usePanel } from "./copilot-provider"

// ChatHistory groups by day against the clock: rendered on the client only, so the page needs no <Suspense> and its
// card is there in the same commit as the navigation (the panel morph needs that).
const subscribeNever = () => () => {}

/** Hairline's ChatHistory over Wappi's threads: grouped by day, searchable, rename, pin, delete with Undo. */
function History({ onPicked }: { onPicked?: () => void }) {
  const { threads, loaded, loadThreads, active, select, rename, remove, pin } =
    useCopilot()
  const t = useTranslations("copilot")
  const client = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
  useEffect(() => {
    if (!loaded) loadThreads()
  }, [loaded, loadThreads])
  if (!client) return null
  if (loaded === "failed")
    return (
      <div className="flex flex-col items-start gap-2 p-3 text-sm text-muted-foreground">
        {t("historyFailed")}
        <Button variant="outline" size="sm" onClick={loadThreads}>
          {t("loadFailed.retry")}
        </Button>
      </div>
    )
  return (
    <ChatHistory
      chats={threads.map((th) => ({
        id: th.id,
        title: th.title,
        pinned: th.pinned,
        updatedAt: th.updatedAt,
      }))}
      activeId={active?.id}
      onSelect={(id) => {
        select(id)
        onPicked?.()
      }}
      onNew={() => {
        select(undefined)
        onPicked?.()
      }}
      onRename={rename}
      onDelete={remove}
      onPin={pin}
    />
  )
}

/**
 * Wappi's full page, inside the dashboard shell (the app sidebar stays): one plate with past chats on the left from lg
 * and the conversation in a centred column beside it. Below lg the history opens as a sheet.
 */
export function CopilotWorkspace() {
  const t = useTranslations("copilot")
  const { select } = useCopilot()
  const { setPanelOpen, returnToRef } = usePanel()
  const router = useRouter()
  return (
    // One tray for the whole assistant (design system, Surfaces): the history lies on the plate, the conversation is
    // the card on it (border starts at the card; p-2 + rounded-xl keeps the corners concentric with rounded-3xl).
    <div className="flex min-h-0 flex-1 gap-2 rounded-3xl bg-card p-2">
      <aside
        aria-label={t("history")}
        className="no-scrollbar hidden w-72 shrink-0 overflow-y-auto lg:block"
      >
        <History />
      </aside>
      <ConversationCard
        variant="page"
        // Below lg the history column is gone: its sheet and New chat move into the title row.
        start={
          <span className="lg:hidden">
            <Sheet
              side="left"
              width={320}
              title={t("history")}
              trigger={
                <Button variant="ghost" size="icon" aria-label={t("history")}>
                  <IconHistory aria-hidden className="size-4" />
                </Button>
              }
            >
              {({ close }) => <History onPicked={close} />}
            </Sheet>
          </span>
        }
        end={
          <>
            <span className="lg:hidden">
              <IconAction
                label={t("newChat")}
                onClick={() => select(undefined)}
              >
                <IconPlus aria-hidden className="size-4" />
              </IconAction>
            </span>
            {/* Back to the page it came from with the panel open, in one transition: the card morphs into the panel. */}
            <IconAction
              label={t("collapse")}
              onClick={() =>
                startTransition(() => {
                  setPanelOpen(true)
                  router.push(returnToRef.current)
                })
              }
            >
              <IconArrowsMinimize aria-hidden className="size-4" />
            </IconAction>
          </>
        }
      />
    </div>
  )
}
