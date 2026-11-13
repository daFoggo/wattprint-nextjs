import { IconMail } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/hairline/button"

/** Email + password: the Server Action opens Keycloak's login page (WattPrint theme, apps/keycloak-theme). */
export function EmailSignInButton({
  action,
}: {
  action: () => Promise<void>
}) {
  const t = useTranslations("auth.signIn")
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="w-full"
        icon={<IconMail aria-hidden className="size-4 shrink-0" />}
      >
        {t("email")}
      </Button>
    </form>
  )
}
