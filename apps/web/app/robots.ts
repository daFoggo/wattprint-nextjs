import type { MetadataRoute } from "next"

import { publicEnv } from "@/lib/env.public"

// An unconfigured production deploy would advertise localhost URLs: keep crawlers out until the URL is set.
const unconfigured =
  process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL

export default function robots(): MetadataRoute.Robots {
  if (unconfigured) return { rules: [{ userAgent: "*", disallow: "/" }] }
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
