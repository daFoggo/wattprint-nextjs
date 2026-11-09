import { Button } from "@workspace/ui/components/button"
import { Google } from "@workspace/ui/components/ui/svgs/google"

/** The only way in: the Server Action starts the Keycloak flow with `kc_idp_hint=google`. */
export function GoogleSignInButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button type="submit" size="lg" className="w-full gap-2">
        <Google aria-hidden className="size-4 shrink-0" />
        Continue with Google
      </Button>
    </form>
  )
}
