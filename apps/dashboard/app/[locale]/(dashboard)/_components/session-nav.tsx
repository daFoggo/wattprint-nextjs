import { getTranslations } from "next-intl/server"
import { hasPermission } from "@workspace/auth/permissions"
import { linkButton } from "@workspace/ui-patterns/link-button"
import { DeleteAccount } from "@/features/auth/components/delete-account"
import { SignOutButton } from "@/features/auth/components/sign-out-button"

import { ScopedNav } from "@/components/layout/sidebar/scoped-nav"
import { UserMenu } from "@/components/layout/sidebar/user-menu"
import { NAV_SCOPES, filterNav } from "@/config/navigation"
import { PRIVACY_PATH } from "@/config/routes"
import { Link } from "@/i18n/navigation"
import { deleteAccountAction, signOutAction } from "@/features/auth/actions"
import { getSession } from "@/lib/dal"

/** Hides links (and whole sections) the role cannot open, in every scope; pages still enforce access. */
export async function SessionNav() {
  const session = await getSession()
  if (!session) return null
  const scopes = filterNav(NAV_SCOPES, (permission) =>
    hasPermission(session.role, permission)
  )
  return <ScopedNav scopes={scopes} />
}

export async function SessionAccount() {
  const session = await getSession()
  if (!session) return null
  const [t, tPrivacy] = await Promise.all([
    getTranslations("layout"),
    getTranslations("privacy"),
  ])
  return (
    <UserMenu
      name={session.name ?? session.email ?? t("account")}
      email={session.email}
      role={session.role}
    >
      <Link
        href={PRIVACY_PATH}
        className={linkButton({ variant: "outline", className: "w-full" })}
      >
        {tPrivacy("link")}
      </Link>
      <SignOutButton action={signOutAction} />
      <DeleteAccount action={deleteAccountAction} />
    </UserMenu>
  )
}
