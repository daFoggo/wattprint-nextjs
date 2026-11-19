"use client"

import { useState } from "react"
import {
  IconChartLine,
  IconDevices,
  IconPlugConnected,
  IconReceipt,
  IconSun,
  IconTargetArrow,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Alert } from "@workspace/ui/components/hairline/alert"
import { Button } from "@workspace/ui/components/hairline/button"
import { ChatScroll } from "@workspace/ui/components/hairline/chat-scroll"
import { INTERACTION_FOCUS } from "@workspace/ui/components/hairline/motion"
import { cn } from "@workspace/ui/lib/utils"

import {
  BILL_PATH,
  DASHBOARD_PATH,
  DEVICES_PATH,
  SETTINGS_PATH,
  STATISTICS_PATH,
} from "@/config/routes"
import { usePathname } from "@/i18n/navigation"

/** What a suggested question is about: its icon, and its words in copilot.suggestions. */
type Topic =
  "devices" | "bill" | "forecast" | "weather" | "plan" | "peers" | "standby"
import { CopilotComposer } from "./copilot-composer"
import { AssistantMessageView, UserMessage } from "./copilot-message"
import { useCopilot } from "./copilot-provider"
import { VoiceMode } from "./voice-mode"
import { MOODS } from "../moods"
import { WappiAvatar } from "./wappi-avatar"

type Page = "overview" | "statistics" | "devices" | "bill" | "settings"

const PAGES: [Page, string][] = [
  ["devices", DEVICES_PATH],
  ["bill", BILL_PATH],
  ["statistics", STATISTICS_PATH],
  ["settings", SETTINGS_PATH],
]

/** The dashboard page the panel sits beside, which sets its suggestions and the "Viewing" chip. */
function pageOf(pathname: string): Page | undefined {
  if (pathname === DASHBOARD_PATH) return "overview"
  return PAGES.find(
    ([, href]) => pathname === href || pathname.startsWith(`${href}/`)
  )?.[0]
}

const SUGGESTIONS: Record<Page | "page", Topic[]> = {
  page: ["devices", "bill", "plan", "weather"],
  overview: ["bill", "devices", "standby", "weather"],
  statistics: ["peers", "forecast", "bill"],
  devices: ["devices", "standby", "plan"],
  bill: ["forecast", "bill", "plan"],
  settings: ["peers", "plan"],
}

const ICONS: Record<Topic, Icon> = {
  devices: IconDevices,
  bill: IconReceipt,
  forecast: IconChartLine,
  weather: IconSun,
  plan: IconTargetArrow,
  peers: IconUsersGroup,
  standby: IconPlugConnected,
}

/** A question to send in one tap: an icon in a round well and the question, as a card on the plate or the page. */
function Suggestion({ topic, children }: { topic: Topic; children: string }) {
  const { send } = useCopilot()
  const Glyph = ICONS[topic]
  return (
    <button
      type="button"
      onClick={() => void send(children)}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 text-left text-sm transition-colors duration-150 hover:bg-accent",
        INTERACTION_FOCUS
      )}
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
      >
        <Glyph className="size-4" />
      </span>
      {children}
    </button>
  )
}

/** The opening screen: who Wappi is, and questions that fit the page beside it. */
function EmptyState({ page, wide }: { page?: Page; wide: boolean }) {
  const t = useTranslations("copilot")
  const { reaction } = useCopilot()
  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col justify-center gap-8 px-4 py-8",
          wide && "max-w-3xl"
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-3",
            wide && "items-center text-center"
          )}
        >
          <WappiAvatar
            size="xl"
            state={reaction ? MOODS[reaction] : MOODS.greeting}
            live
            follow
          />
          <h2
            className={cn(
              "font-medium tracking-tight",
              wide ? "text-2xl md:text-3xl" : "text-xl"
            )}
          >
            {t("empty.title")}
          </h2>
          <p className="max-w-xl text-base text-muted-foreground">
            {t("empty.description")}
          </p>
        </div>
        <section className="flex flex-col gap-3">
          <h3 className="text-sm text-muted-foreground">
            {t(wide ? "empty.start" : "empty.suggested")}
          </h3>
          <div className={cn("grid gap-2", wide && "sm:grid-cols-2")}>
            {SUGGESTIONS[wide ? "page" : (page ?? "overview")].map((topic) => (
              <Suggestion key={topic} topic={topic}>
                {t(`suggestions.${topic}`)}
              </Suggestion>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * One conversation with Wappi: the messages in Hairline's ChatScroll (follows the stream, lets go when you scroll
 * up), or the opening screen, or voice mode; the composer under them. `variant` is where it sits: the side panel
 * (narrow, knows the page beside it) or the full page (a centred reading column).
 */
export function CopilotThread({ variant }: { variant: "panel" | "page" }) {
  const t = useTranslations("copilot")
  const { active, status, select } = useCopilot()
  const [voice, setVoice] = useState(false)
  const pathname = usePathname()
  const wide = variant === "page"
  const page = wide ? undefined : pageOf(pathname)
  const messages = active?.messages ?? []
  const lastUser = messages.filter((m) => m.role === "user").at(-1)
  const column = cn("mx-auto w-full px-4", wide && "max-w-3xl")

  if (voice)
    return <VoiceMode size={wide ? 260 : 180} onBack={() => setVoice(false)} />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {active?.failed ? (
        <div className={cn(column, "py-6")}>
          <Alert
            tone="warning"
            title={t("loadFailed.title")}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => select(active.id)}
              >
                {t("loadFailed.retry")}
              </Button>
            }
          >
            {t("loadFailed.body")}
          </Alert>
        </div>
      ) : null}
      {messages.length ? (
        <ChatScroll
          streaming={status !== "ready"}
          followKey={lastUser?.id}
          className="no-scrollbar min-h-0 flex-1"
          contentClassName={cn(column, "flex flex-col gap-8 py-6")}
        >
          {messages.map((m, i) =>
            m.role === "user" ? (
              <UserMessage key={m.id} text={m.text} />
            ) : (
              <AssistantMessageView
                key={m.id}
                message={m}
                last={i === messages.length - 1}
              />
            )
          )}
        </ChatScroll>
      ) : (
        <EmptyState page={page} wide={wide} />
      )}
      <div className={cn(column, "flex shrink-0 flex-col gap-2 pb-2")}>
        <CopilotComposer
          context={page && t(`pages.${page}`)}
          onVoice={() => setVoice(true)}
        />
      </div>
    </div>
  )
}
