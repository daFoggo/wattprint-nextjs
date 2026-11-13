import { notFound } from "next/navigation"

// Always redirects / 404s, so there is no static shell to validate (docs: route-segment-config/instant).
export const instant = false

/** Any path no route matches renders `[locale]/not-found.tsx` inside the localized root layout. */
export default function CatchAll() {
  notFound()
}
