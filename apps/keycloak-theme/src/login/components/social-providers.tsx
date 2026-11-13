import { kcSanitize } from "keycloakify/lib/kcSanitize"

import { Google } from "@workspace/ui/components/ui/svgs/google"
import { linkButton } from "@workspace/ui-patterns/link-button"

import type { I18n } from "../i18n"
import type { KcContext } from "../KcContext"

type Provider = NonNullable<
  NonNullable<
    Extract<KcContext, { pageId: "login.ftl" }>["social"]
  >["providers"]
>[number]

/** "or" rule, then one button per identity provider (today: Google), styled as the dashboard's Google button. */
export function SocialProviders({
  providers,
  i18n,
}: {
  providers: Provider[] | undefined
  i18n: I18n
}) {
  if (!providers?.length) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {i18n.msg("orContinueWith")}
        <span className="h-px flex-1 bg-border" />
      </div>
      {providers.map((p) => (
        <a
          key={p.alias}
          id={`social-${p.alias}`}
          href={p.loginUrl}
          className={linkButton({ variant: "outline", className: "w-full" })}
        >
          {p.alias === "google" ? (
            <Google aria-hidden className="size-4 shrink-0" />
          ) : null}
          {p.alias === "google" ? (
            i18n.msg("continueWithGoogle")
          ) : (
            <span
              // The provider's display name from the realm, sanitized by keycloakify.
              dangerouslySetInnerHTML={{ __html: kcSanitize(p.displayName) }}
            />
          )}
        </a>
      ))}
    </div>
  )
}
