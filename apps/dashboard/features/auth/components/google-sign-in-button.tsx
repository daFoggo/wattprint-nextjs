import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"
import { Google } from "@workspace/ui/components/ui/svgs/google"

/**
 * Google, one click: the Server Action starts the Keycloak flow with `kc_idp_hint=google`.
 * Neutral (`secondary`), not brand green: Google's multicolour mark belongs on a plain surface.
 */
export function GoogleSignInButton({
  action,
}: {
  action: () => Promise<void>
}) {
  const t = useTranslations("auth.signIn")
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="w-full"
        icon={<Google aria-hidden className="size-4 shrink-0" />}
      >
        {t("google")}
      </Button>
    </form>
  )
}
