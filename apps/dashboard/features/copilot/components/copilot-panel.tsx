"use client"

import { IconArrowsMaximize, IconPlus, IconX } from "@tabler/icons-react"
import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  ViewTransition,
} from "react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { EASE_OUT } from "@workspace/ui/components/hairline/motion"
import { Tooltip } from "@workspace/ui/components/hairline/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { COPILOT_PATH, onCopilotPage } from "@/config/routes"
import { useMediaQuery } from "@/hooks/use-media-query"
import { usePathname, useRouter } from "@/i18n/navigation"

import { useCopilot, usePanel } from "./copilot-provider"
import { CopilotThread } from "./copilot-thread"
import { WappiLogo } from "./wappi-logo"

export function IconAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
        {children}
      </Button>
    </Tooltip>
  )
}

function Title() {
  const t = useTranslations("copilot")
  return (
    <span className="flex min-w-0 items-center gap-2">
      <WappiLogo size="sm" />
      <span className="text-sm font-medium">{t("name")}</span>
    </span>
  )
}

/** New chat and Open full page: the chat carries over, since both views read the same provider. */
function Actions() {
  const t = useTranslations("copilot")
  const { select } = useCopilot()
  const { setPanelOpen } = usePanel()
  const router = useRouter()
  return (
    <>
      <IconAction label={t("newChat")} onClick={() => select(undefined)}>
        <IconPlus aria-hidden className="size-4" />
      </IconAction>
      <IconAction
        label={t("expand")}
        // One transition: the panel goes and the page arrives in the same commit, so the card morphs between them.
        onClick={() =>
          startTransition(() => {
            setPanelOpen(false)
            router.push(COPILOT_PATH)
          })
        }
      >
        <IconArrowsMaximize aria-hidden className="size-4" />
      </IconAction>
    </>
  )
}

/**
 * The conversation as one card (title row, chat, composer): the right half of Wappi's page and the whole of its side
 * panel, so both read the same. `start` and `end` hold the title row's extra buttons.
 */
export function ConversationCard({
  variant,
  start,
  end,
  className,
}: {
  variant: "panel" | "page"
  start?: React.ReactNode
  end?: React.ReactNode
  className?: string
}) {
  return (
    // Same name in the panel and on the page: navigating between them morphs this card (globals.css, `.morph`).
    <ViewTransition name="wappi-conversation" share="morph" default="none">
      <section
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-background",
          className
        )}
      >
        {/* The rule keeps scrolled content from reading as cut off under the title. */}
        <div className="flex h-12 shrink-0 items-center gap-1 border-b px-2">
          {start}
          <span className="px-1">
            <Title />
          </span>
          <span className="ml-auto flex gap-1">{end}</span>
        </div>
        <CopilotThread variant={variant} />
      </section>
    </ViewTransition>
  )
}

/**
 * Wappi beside the page: the conversation card of Wappi's page, on its own. Full screen on phones (modal there: the
 * rest of the shell is inert and the page does not scroll behind it), a 384px column floating over the page's right
 * edge from sm, and from 2xl a third column that pushes the page aside (narrower, pushing would squeeze the dashboard's
 * lg grids). Eases between 0 and its width; Escape closes it. Hidden on Wappi's own page, the full-size version.
 */
export function CopilotPanel() {
  const t = useTranslations("copilot")
  const { panelOpen, setPanelOpen, returnToRef, toggleRef } = usePanel()
  const pathname = usePathname()
  const onPage = onCopilotPage(pathname)
  const ref = useRef<HTMLElement>(null)
  const wasOpen = useRef(panelOpen)
  const modal = useMediaQuery("(width < 40rem)") && panelOpen && !onPage
  // The chat is mounted only while the panel shows (and for its closing ease): a closed panel keeps no conversation
  // re-rendering behind it, and voice mode's microphone goes off with it.
  const [shown, setShown] = useState(panelOpen)
  if (panelOpen && !shown) setShown(true)
  useEffect(() => {
    if (panelOpen) return
    const timer = window.setTimeout(() => setShown(false), 300)
    return () => window.clearTimeout(timer)
  }, [panelOpen])

  useEffect(() => {
    if (!onPage) returnToRef.current = pathname
  }, [onPage, pathname, returnToRef])

  // Cmd/Ctrl+J opens and closes the panel, like Cmd/Ctrl+B the sidebar; not on Wappi's page, which has no panel.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (onPage || event.key !== "j" || !(event.metaKey || event.ctrlKey)) return
    event.preventDefault()
    setPanelOpen(!panelOpen)
  })
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // On phones the panel covers the screen: what lies under it can be neither tabbed to nor scrolled.
  useEffect(() => {
    const parent = ref.current?.parentElement
    if (!modal || !parent) return
    const others = [...parent.children].filter(
      (el): el is HTMLElement =>
        el instanceof HTMLElement && el !== ref.current && !el.inert
    )
    for (const el of others) el.inert = true
    const root = document.documentElement
    root.style.overflow = "hidden"
    return () => {
      for (const el of others) el.inert = false
      root.style.overflow = ""
    }
  }, [modal])

  // Opening puts the cursor in the composer (so Escape works at once); closing makes the panel inert, which drops
  // focus (to the body, a moment later), so it goes back to the header's button. Only on a change, not on mount.
  useEffect(() => {
    if (wasOpen.current === panelOpen) return
    wasOpen.current = panelOpen
    if (panelOpen)
      ref.current?.querySelector("textarea")?.focus({ preventScroll: true })
    else if (
      document.activeElement === document.body ||
      ref.current?.contains(document.activeElement)
    )
      toggleRef.current?.focus()
  }, [panelOpen, toggleRef])

  if (onPage) return null
  return (
    <aside
      ref={ref}
      aria-label={t("name")}
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      data-state={panelOpen ? "open" : "closed"}
      inert={!panelOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented)
          setPanelOpen(false)
      }}
      style={{ transitionTimingFunction: EASE_OUT }}
      className="fixed inset-y-0 right-0 z-40 h-svh w-0 overflow-hidden transition-[width] duration-300 data-[state=open]:w-full motion-reduce:transition-none sm:data-[state=open]:w-96 2xl:sticky 2xl:top-0 2xl:z-auto 2xl:shrink-0"
    >
      {/* No tray: the card alone, in the sidebar's 8px frame and with its radius, so the panel spends no space on a rim. */}
      {shown ? (
        <div className="flex h-full w-screen bg-background p-2 sm:w-96">
          <ConversationCard
            variant="panel"
            className="rounded-3xl"
            end={
              <>
                <Actions />
                <IconAction
                  label={t("closePanel")}
                  onClick={() => setPanelOpen(false)}
                >
                  <IconX aria-hidden className="size-4" />
                </IconAction>
              </>
            }
          />
        </div>
      ) : null}
    </aside>
  )
}
