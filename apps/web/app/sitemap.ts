import type { MetadataRoute } from "next"

import { publicEnv } from "@/lib/env.public"

const unconfigured =
  process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL

export default function sitemap(): MetadataRoute.Sitemap {
  if (unconfigured) return []
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ]
}
