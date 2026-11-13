import { lazy, Suspense } from "react"
import DefaultPage from "keycloakify/login/DefaultPage"

import { HairlineTextProvider } from "@workspace/ui/components/hairline-text"
import { hairlineMessages } from "@workspace/ui/lib/hairline-messages"

import { classes } from "./classes"
import { useI18n, type I18n } from "./i18n"
import type { KcContext } from "./KcContext"
import Login from "./pages/Login"
import LoginResetPassword from "./pages/LoginResetPassword"
import Register, { REGISTER_FIELDS } from "./pages/Register"
import Template from "./Template"

const UserProfileFormFields = lazy(
  () => import("keycloakify/login/UserProfileFormFields")
)

// The pages people walk through (sign in, sign up, reset) are bundled eagerly: one chunk less to wait for per page.
function Page({ kcContext, i18n }: { kcContext: KcContext; i18n: I18n }) {
  const props = { i18n, classes, Template, doUseDefaultCss: false }
  switch (kcContext.pageId) {
    case "login.ftl":
      return <Login kcContext={kcContext} {...props} />
    case "login-reset-password.ftl":
      return <LoginResetPassword kcContext={kcContext} {...props} />
    case "register.ftl":
      // Recaptcha, terms, or extra profile attributes: the generic page renders those.
      if (
        !kcContext.recaptchaRequired &&
        !kcContext.termsAcceptanceRequired &&
        Object.keys(kcContext.profile.attributesByName).every((name) =>
          REGISTER_FIELDS.includes(name)
        )
      )
        return <Register kcContext={kcContext} {...props} />
  }
  return (
    <DefaultPage
      kcContext={kcContext}
      {...props}
      UserProfileFormFields={UserProfileFormFields}
      doMakeUserConfirmPassword
    />
  )
}

export default function KcPage({ kcContext }: { kcContext: KcContext }) {
  const { i18n } = useI18n({ kcContext })
  // Until Vietnamese loads, keycloakify serves its English: render nothing rather than flash the wrong language.
  if (i18n.isFetchingTranslations) return null
  return (
    <HairlineTextProvider
      messages={hairlineMessages[i18n.currentLanguage.languageTag] ?? {}}
    >
      <Suspense>
        <Page kcContext={kcContext} i18n={i18n} />
      </Suspense>
    </HairlineTextProvider>
  )
}
