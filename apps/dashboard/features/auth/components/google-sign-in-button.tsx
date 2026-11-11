import { Button } from "@workspace/ui/components/hairline/button"
import { Google } from "@workspace/ui/components/ui/svgs/google"

/**
 * The only way in: the Server Action starts the Keycloak flow with `kc_idp_hint=google`.
 * Neutral (`secondary`), not brand green: Google's multicolour mark belongs on a plain surface.
 */
export function GoogleSignInButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="secondary"
        size="lg"
        className="w-full"
        icon={<Google aria-hidden className="size-4 shrink-0" />}
      >
        Continue with Google
      </Button>
    </form>
  )
}
