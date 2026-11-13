import { createGetKcContextMock } from "keycloakify/login/KcContext"

import { kcEnvDefaults, themeNames } from "../kc.gen"
import type { KcContext } from "./KcContext"

const { getKcContextMock } = createGetKcContextMock({
  kcContextExtension: {
    themeName: themeNames[0],
    properties: { ...kcEnvDefaults },
  },
  kcContextExtensionPerPage: {},
  overrides: {},
  overridesPerPage: {},
})

/** Dev-only preview data (`pnpm dev`): ?page=<pageId>&lang=vi|en&error=1. */
export function mockKcContext(params: URLSearchParams): KcContext {
  const pageId = (params.get("page") ?? "login.ftl") as KcContext["pageId"]
  const lang = params.get("lang") ?? "vi"
  return getKcContextMock({
    pageId,
    overrides: {
      locale: {
        currentLanguageTag: lang,
        supported: [
          { languageTag: "vi", label: "Tiếng Việt", url: "?lang=vi" },
          { languageTag: "en", label: "English", url: "?lang=en" },
        ],
      },
      // As the wattprint realm: sign-up with email as username, password reset, no "remember me".
      realm: {
        registrationAllowed: true,
        registrationEmailAsUsername: true,
        rememberMe: false,
        resetPasswordAllowed: true,
      },
      social: {
        providers: [
          {
            alias: "google",
            displayName: "Google",
            loginUrl: "#",
            providerId: "google",
            iconClasses: "",
          },
        ],
      },
      ...(params.get("error")
        ? {
            messagesPerField: {
              existsError: () => true,
              getFirstError: () => "Invalid username or password.",
            },
          }
        : {}),
    } as never,
  })
}
