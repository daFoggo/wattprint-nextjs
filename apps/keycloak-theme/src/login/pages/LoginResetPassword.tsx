import { useState } from "react"
import { kcSanitize } from "keycloakify/lib/kcSanitize"
import type { PageProps } from "keycloakify/login/pages/PageProps"

import { Button } from "@workspace/ui/components/hairline/button"
import { Input } from "@workspace/ui/components/hairline/input"

import type { I18n } from "../i18n"
import type { KcContext } from "../KcContext"

/** login-reset-password.ftl: the email to send the reset link to, posted natively to Keycloak. */
export default function LoginResetPassword(
  props: PageProps<Extract<KcContext, { pageId: "login-reset-password.ftl" }>, I18n>
) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props
  const { url, realm, auth, messagesPerField } = kcContext
  const { msg, msgStr } = i18n
  const [submitting, setSubmitting] = useState(false)

  const invalid = messagesPerField.existsError("username")

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      displayMessage={!invalid}
      headerNode={msg("emailForgotTitle")}
      displayInfo
      infoNode={
        <span>
          {msg("rememberedPassword")}{" "}
          <a
            href={url.loginUrl}
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            {msg("doLogIn")}
          </a>
        </span>
      }
    >
      <p className="-mt-6 text-muted-foreground">
        {realm.duplicateEmailsAllowed
          ? msg("emailInstructionUsername")
          : msg("emailInstruction")}
      </p>
      <form
        action={url.loginAction}
        method="post"
        className="flex flex-col gap-4"
        onSubmit={() => setSubmitting(true)}
      >
        <Input
          id="username"
          name="username"
          type="text"
          label={realm.loginWithEmailAllowed ? msg("email") : msg("username")}
          defaultValue={auth.attemptedUsername ?? ""}
          autoFocus
          autoComplete="username"
          inputMode="email"
          required
          error={
            invalid ? (
              <span
                // Keycloak's field error, sanitized by keycloakify.
                dangerouslySetInnerHTML={{
                  __html: kcSanitize(messagesPerField.get("username")),
                }}
              />
            ) : undefined
          }
        />
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          loading={submitting}
          disabled={submitting}
        >
          {msgStr("sendResetLink")}
        </Button>
      </form>
    </Template>
  )
}
