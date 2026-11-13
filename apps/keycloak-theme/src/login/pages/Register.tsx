import { useState } from "react"
import { kcSanitize } from "keycloakify/lib/kcSanitize"
import type { PageProps } from "keycloakify/login/pages/PageProps"

import { Button } from "@workspace/ui/components/hairline/button"
import { Input } from "@workspace/ui/components/hairline/input"
import { PasswordInput } from "@workspace/ui/components/hairline/password-input"

import type { I18n } from "../i18n"
import type { KcContext } from "../KcContext"

type RegisterContext = Extract<KcContext, { pageId: "register.ftl" }>

/** Attributes this form renders; KcPage falls back to keycloakify's generic page if the realm's user profile adds others. */
export const REGISTER_FIELDS = ["username", "email", "firstName", "lastName", "locale"]

/**
 * register.ftl with the realm's fixed profile (email as username, first and last name), posted natively to
 * `url.registrationAction`. Keycloak validates everything (password policy, duplicate email) and re-renders this
 * page with per-field errors and the typed values.
 */
export default function Register(props: PageProps<RegisterContext, I18n>) {
  const { kcContext, i18n, Template, doUseDefaultCss, classes } = props
  const { url, profile, messagesPerField, passwordPolicies } = kcContext
  const { msg, msgStr, currentLanguage } = i18n
  const [submitting, setSubmitting] = useState(false)

  const value = (name: string) => profile.attributesByName[name]?.value ?? ""
  const error = (name: string) =>
    messagesPerField.existsError(name) ? (
      <span
        // Keycloak's field error, sanitized by keycloakify.
        dangerouslySetInnerHTML={{
          __html: kcSanitize(messagesPerField.get(name)),
        }}
      />
    ) : undefined

  const firstName = (
    <Input
      key="firstName"
      id="firstName"
      name="firstName"
      label={msg("firstName")}
      defaultValue={value("firstName")}
      autoComplete="given-name"
      required
      error={error("firstName")}
    />
  )
  const lastName = (
    <Input
      key="lastName"
      id="lastName"
      name="lastName"
      label={msg("lastName")}
      defaultValue={value("lastName")}
      autoComplete="family-name"
      required
      error={error("lastName")}
    />
  )

  return (
    <Template
      kcContext={kcContext}
      i18n={i18n}
      doUseDefaultCss={doUseDefaultCss}
      classes={classes}
      displayMessage={messagesPerField.exists("global")}
      headerNode={msg("registerTitle")}
      displayInfo
      infoNode={
        <span>
          {msg("haveAccount")}{" "}
          <a
            href={url.loginUrl}
            className="font-medium text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            {msg("doLogIn")}
          </a>
        </span>
      }
    >
      <p className="-mt-6 text-muted-foreground">{msg("registerSubtitle")}</p>
      <form
        action={url.registrationAction}
        method="post"
        className="flex flex-col gap-4"
        onSubmit={() => setSubmitting(true)}
      >
        {/* The user's language, as keycloakify's generic form posts it: Keycloak's mails to them use it. */}
        <input
          type="hidden"
          name="locale"
          value={currentLanguage.languageTag}
        />
        {/* Vietnamese names read family name first. */}
        <div className="grid grid-cols-2 gap-3">
          {currentLanguage.languageTag === "vi"
            ? [lastName, firstName]
            : [firstName, lastName]}
        </div>
        <Input
          id="email"
          name="email"
          type="email"
          label={msg("email")}
          defaultValue={value("email")}
          autoComplete="email"
          inputMode="email"
          required
          error={error("email") ?? error("username")}
        />
        <PasswordInput
          id="password"
          name="password"
          label={msg("password")}
          autoComplete="new-password"
          required
          strength
          hint={
            passwordPolicies?.length
              ? msgStr("passwordMinLength", String(passwordPolicies.length))
              : undefined
          }
          error={error("password")}
        />
        <PasswordInput
          id="password-confirm"
          name="password-confirm"
          label={msg("passwordConfirm")}
          autoComplete="new-password"
          required
          error={error("password-confirm")}
        />
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          loading={submitting}
          disabled={submitting}
        >
          {msgStr("doRegister")}
        </Button>
      </form>
    </Template>
  )
}
