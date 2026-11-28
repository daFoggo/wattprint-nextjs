import "server-only"

import { requirePermission } from "@/lib/dal"

import {
  fetchAiHome,
  fetchConsents,
  fetchMembers,
  fetchOutbound,
  fetchPrivacy,
} from "./server"

/** Everything the page shows, fresh per request. Only for an account with a home. */
export async function getPrivacyPage() {
  const { accessToken } = await requirePermission("account:view")
  const [privacy, home, consents, outbound] = await Promise.all([
    fetchPrivacy(accessToken),
    fetchAiHome(accessToken),
    fetchConsents(accessToken),
    fetchOutbound(accessToken),
  ])
  // A demo visitor is not part of the household: the backend gives them no list.
  const members =
    home.role === "viewer" ? null : await fetchMembers(accessToken)
  return { privacy, home, consents, outbound, members }
}
