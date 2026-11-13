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
export const REGISTER_FIELDS = [
  "username",
  "email",
  "firstName",
  "lastName",
  "locale",
]

type Policies = RegisterContext["passwordPolicies"]
type Msg = I18n["msgStr"]

/**
 * The realm's password rules (the ones Keycloak exposes to the page), each with its line in the hint and its check.
 * The hint and the meter both come from this list, so they say what Keycloak enforces.
 */
function passwordRules(policies: Policies, email: string, msgStr: Msg) {
  const count = (re: RegExp, v: string) => (v.match(re) ?? []).length
  const p = policies ?? {}
  const rules: { key: string; label: string; ok: (v: string) => boolean }[] = []
  if (p.length)
    rules.push({
      key: "length",
      label: msgStr("passwordMinLength", String(p.length)),
      ok: (v) => v.length >= p.length!,
    })
  // Same character classes as Keycloak's policy providers (Java Character.isUpperCase, isDigit, isLetterOrDigit).
  for (const [n, key, re] of [
    [p.upperCase, "passwordUpperCase", /\p{Lu}/gu],
    [p.lowerCase, "passwordLowerCase", /\p{Ll}/gu],
    [p.digits, "passwordDigits", /\p{Nd}/gu],
    [p.specialChars, "passwordSpecialChars", /[^\p{L}\p{Nd}]/gu],
  ] as const)
    if (n)
      rules.push({
        key,
        label: msgStr(key, String(n)),
        ok: (v) => count(re, v) >= n,
      })
  // Email is the username in this realm, so notUsername and notEmail are the same check.
  if (p.notUsername || p.notEmail)
    rules.push({
      key: "notEmail",
      label: msgStr("passwordNotEmail"),
      ok: (v) => v.toLowerCase() !== email.trim().toLowerCase(),
    })
  return rules
}

/** Every rule, ticked as the typed password meets it (as Supabase's sign-up does). */
function PasswordChecklist({
  rules,
  password,
}: {
  rules: ReturnType<typeof passwordRules>
  password: string
}) {
  if (!rules.length) return null
  return (
    <ul id="password-rules" className="flex flex-col gap-1.5 px-3 text-sm">
      {rules.map((rule) => {
        const ok = password !== "" && rule.ok(password)
        return (
          <li
            key={rule.key}
            className={`flex items-center gap-2 transition-colors duration-200 ${ok ? "text-foreground" : "text-muted-foreground"}`}
          >
            <svg
              viewBox="0 0 16 16"
              className="size-4 shrink-0"
              aria-hidden="true"
            >
              {ok ? (
                <>
                  <circle cx="8" cy="8" r="7" className="fill-emerald-500" />
                  <path
                    d="M5 8.2 7 10.2 11 6"
                    fill="none"
                    className="stroke-background"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : (
                <circle
                  cx="8"
                  cy="8"
                  r="6.25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              )}
            </svg>
            {rule.label}
            <span className="sr-only">{ok ? " ✓" : ""}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** The meter fills with the checklist: "Strong" only once every rule passes (Keycloak accepts it). No rules: Hairline's heuristic. */
function policyScore(rules: ReturnType<typeof passwordRules>) {
  return (password: string): PasswordScore => {
    if (!password) return 0
    if (!rules.length) return scorePassword(password)
    // Too short is weak, whatever else it has.
    if (rules.some((rule) => rule.key === "length" && !rule.ok(password)))
      return 1
    const passed = rules.filter((rule) => rule.ok(password)).length
    if (passed === rules.length) return 4
    return Math.max(
      1,
      Math.min(3, Math.ceil((passed / rules.length) * 4))
    ) as PasswordScore
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
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState(
    profile.attributesByName.email?.value ?? ""
  )

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
        <div className="flex flex-col gap-3">
          <PasswordInput
            id="password"
            name="password"
            label={msg("password")}
            autoComplete="new-password"
            required
            strength={policyScore(rules)}
            onValueChange={setPassword}
            aria-describedby="password-rules"
            error={error("password")}
          />
          <PasswordChecklist rules={rules} password={password} />
        </div>
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
