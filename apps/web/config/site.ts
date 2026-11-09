import { publicEnv } from "@/lib/env.public"

/** Absolute link into the dashboard app (apps/dashboard), which owns sign-in and every signed-in page. */
export function dashboardHref(path: string): string {
  return new URL(path, publicEnv.NEXT_PUBLIC_DASHBOARD_URL).toString()
}

export const REPO_URL = "https://github.com/daFoggo/next-mono-base"

/** A file in the repo's docs/ folder on GitHub. */
export function docsHref(file: string): string {
  return `${REPO_URL}/blob/main/docs/${file}`
}

export const DASHBOARD_HREF = dashboardHref("/dashboard")
