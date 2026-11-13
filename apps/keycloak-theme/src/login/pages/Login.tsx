import { useState } from "react"
import { kcSanitize } from "keycloakify/lib/kcSanitize"
import type { PageProps } from "keycloakify/login/pages/PageProps"

import { Button } from "@workspace/ui/components/hairline/button"
import { Input } from "@workspace/ui/components/hairline/input"
import { PasswordInput } from "@workspace/ui/components/hairline/password-input"

import { SocialProviders } from "../components/social-providers"
import type { I18n } from "../i18n"
import type { KcContext } from "../KcContext"

/**
 * login.ftl: email + password posted straight to Keycloak (`url.loginAction`, a native form: Keycloak owns the
 * session, the CSRF-bound action URL and the brute-force lockout), then the identity providers.
 * "Remember me" and passkeys are off in the realm, so they are not rendered.
 */
export default function Login(
  props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>
) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props
  const {
    social,
    realm,
    url,
    usernameHidden,
    login,
    auth,
    messagesPerField,
    registrationDisabled,
  } = kcContext
  const { msg, msgStr } = i18n
  const [submitting, setSubmitting] = useState(false)

  const invalid = messagesPerField.existsError("username", "password")
  // Keycloak's field error (e.g. "Invalid username or password."), sanitized by keycloakify.
  const error = invalid ? (
    <span
      dangerouslySetInnerHTML={{
        __html: kcSanitize(
          messagesPerField.getFirstError("username", "password")
        ),
      }}
    />
  ) : undefined

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      displayMessage={!invalid}
      headerNode={msg("loginAccountTitle")}
      socialProvidersNode={
        <SocialProviders providers={social?.providers} i18n={i18n} />
      }
      displayInfo={
        realm.password && realm.registrationAllowed && !registrationDisabled
      }
      infoNode={
        <span>
          {msg("noAccount")}{" "}
          <a
            href={url.registrationUrl}
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            {msg("doRegister")}
          </a>
        </span>
      }
    >
      <p className="-mt-6 text-muted-foreground">
        {msg("loginAccountSubtitle")}
      </p>
      {realm.password ? (
        <form
          action={url.loginAction}
          method="post"
          className="flex flex-col gap-4"
          onSubmit={() => setSubmitting(true)}
        >
          {!usernameHidden ? (
            <Input
              id="username"
              name="username"
              type="text"
              label={
                realm.loginWithEmailAllowed ? msg("email") : msg("username")
              }
              defaultValue={login.username ?? ""}
              autoFocus
              autoComplete="username"
              inputMode="email"
              aria-invalid={invalid}
              error={error}
            />
          ) : null}
          <PasswordInput
            id="password"
            name="password"
            label={msg("password")}
            autoComplete="current-password"
            aria-invalid={invalid}
            error={usernameHidden ? error : undefined}
          />
          {realm.resetPasswordAllowed ? (
            <a
              href={url.loginResetCredentialsUrl}
              className="self-end text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {msg("doForgotPassword")}
            </a>
          ) : null}
          <input
            type="hidden"
            name="credentialId"
            value={auth.selectedCredential ?? ""}
          />
          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full"
            loading={submitting}
            disabled={submitting}
          >
            {msgStr("doLogIn")}
          </Button>
        </form>
      ) : null}
    </Template>
  )
}
