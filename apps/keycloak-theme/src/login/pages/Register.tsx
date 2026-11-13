import { useState } from "react"
import { kcSanitize } from "keycloakify/lib/kcSanitize"
import type { PageProps } from "keycloakify/login/pages/PageProps"

import { Button } from "@workspace/ui/components/hairline/button"
import { Input } from "@workspace/ui/components/hairline/input"
import {
  PasswordInput,
  scorePassword,
  type PasswordScore,
} from "@workspace/ui/components/hairline/password-input"

import type { I18n } from "../i18n"
import type { KcContext } from "../KcContext"

type RegisterContext = Extract<KcContext, { pageId: "register.ftl" }>

/** Attributes this form renders; KcPage falls back to keycloakify's generic page if the realm's user profile adds others. */
export const REGISTER_FIELDS = ["username", "email", "firstName", "lastName", "locale"]

type Policies = RegisterContext["passwordPolicies"]
type Msg = I18n["msgStr"]

/**
 * The realm's password rules (the ones Keycloak exposes to the page), each with its line in the hint and its check.
 * The hint and the meter both come from this list, so they say what Keycloak enforces.
 */
function passwordRules(policies: Policies, email: string, msgStr: Msg) {
  const count = (re: RegExp, v: string) => (v.match(re) ?? []).length
  const p = policies ?? {}
  const rules: { label: string; ok: (v: string) => boolean }[] = []
  if (p.length)
    rules.push({
      label: msgStr("passwordMinLength", String(p.length)),
      ok: (v) => v.length >= p.length!,
    })
  for (const [n, key, re] of [
    [p.digits, "passwordDigits", /\d/g],
    [p.upperCase, "passwordUpperCase", /[A-Z]/g],
    [p.lowerCase, "passwordLowerCase", /[a-z]/g],
    [p.specialChars, "passwordSpecialChars", /[^A-Za-z0-9]/g],
  ] as const)
    if (n) rules.push({ label: msgStr(key, String(n)), ok: (v) => count(re, v) >= n })
  // Email is the username in this realm, so notUsername and notEmail are the same check.
  if (p.notUsername || p.notEmail)
    rules.push({
      label: msgStr("passwordNotEmail"),
      ok: (v) => v.toLowerCase() !== email.trim().toLowerCase(),
    })
  return rules
}

/** A password Keycloak would reject is always "Weak"; one it accepts starts at "Fair", Hairline's heuristic adds the rest. */
function policyScore(rules: ReturnType<typeof passwordRules>) {
  return (password: string): PasswordScore => {
    if (!password) return 0
    if (!rules.every((rule) => rule.ok(password))) return 1
    return Math.max(2, scorePassword(password)) as PasswordScore
  }
}

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
  const [email, setEmail] = useState(profile.attributesByName.email?.value ?? "")

  const rules = passwordRules(passwordPolicies, email, msgStr)
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
          onValueChange={setEmail}
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
          strength={policyScore(rules)}
          hint={
            rules.length
              ? rules.map((rule) => rule.label).join(", ") + "."
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
