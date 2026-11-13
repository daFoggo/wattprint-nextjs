import { useEffect } from "react"
import { kcSanitize } from "keycloakify/lib/kcSanitize"
import { useInitialize } from "keycloakify/login/Template.useInitialize"
import type { TemplateProps } from "keycloakify/login/TemplateProps"

import { Alert } from "@workspace/ui/components/hairline/alert"

import { Frame, Heading } from "./components/frame"
import type { I18n } from "./i18n"
import type { KcContext } from "./KcContext"

const TONE = {
  success: "success",
  warning: "warning",
  error: "danger",
  info: "info",
} as const

/** Every Keycloak page but login (which composes Frame itself) renders inside this: WattPrint's frame, not Patternfly. */
export default function Template(props: TemplateProps<KcContext, I18n>) {
  const {
    displayInfo = false,
    displayMessage = true,
    headerNode,
    socialProvidersNode = null,
    infoNode = null,
    documentTitle,
    kcContext,
    i18n,
    doUseDefaultCss,
    children,
  } = props
  const { msg, msgStr, currentLanguage } = i18n
  const { auth, url, message, isAppInitiatedAction } = kcContext

  useEffect(() => {
    document.title = documentTitle ?? msgStr("loginTitle")
    document.documentElement.lang = currentLanguage.languageTag
  }, [documentTitle, msgStr, currentLanguage.languageTag])

  const { isReadyToRender } = useInitialize({ kcContext, doUseDefaultCss })
  if (!isReadyToRender) return null

  return (
    <Frame
      i18n={i18n}
      landingUrl={`${kcContext.properties.WATTPRINT_LANDING_URL}${currentLanguage.languageTag === "en" ? "/en" : ""}`}
    >
      {auth?.showUsername && !auth.showResetCredentials ? (
        // Later steps of a sign-in: whose account it is, and a way to start over.
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate font-medium">{auth.attemptedUsername}</span>
          <a
            href={url.loginRestartFlowUrl}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {msg("restartLoginTooltip")}
          </a>
        </div>
      ) : null}
      <Heading title={headerNode} />
      {displayMessage &&
      message !== undefined &&
      (message.type !== "warning" || !isAppInitiatedAction) ? (
        <Alert
          tone={TONE[message.type]}
          title={
            <span
              // Keycloak's message, sanitized by keycloakify (it may hold markup such as links).
              dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }}
            />
          }
        />
      ) : null}
      <div className="flex flex-col gap-6">{children}</div>
      {auth?.showTryAnotherWayLink ? (
        <form action={url.loginAction} method="post">
          <input type="hidden" name="tryAnotherWay" value="on" />
          <button
            type="submit"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {msg("doTryAnotherWay")}
          </button>
        </form>
      ) : null}
      {socialProvidersNode}
      {displayInfo ? (
        <div className="text-sm text-muted-foreground">{infoNode}</div>
      ) : null}
    </Frame>
  )
}
