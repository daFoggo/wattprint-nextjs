import type { Me } from "../schemas"

/** Proves the Keycloak token is accepted by FastAPI: shows the profile it answers with. */
export function BackendStatus({ me }: { me: Me }) {
  return (
    <p className="text-sm text-muted-foreground">
      FastAPI: {me.email} ({me.roles.join(", ")})
    </p>
  )
}
