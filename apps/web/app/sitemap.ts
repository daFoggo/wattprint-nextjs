import type { MetadataRoute } from "next"

import { publicEnv } from "@/lib/env.public"
import { LAST_EDITED } from "@/lib/seo"

const unconfigured =
  process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL

export default function sitemap(): MetadataRoute.Sitemap {
  if (unconfigured) return []
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL

  // Each page in Vietnamese (no prefix) with its English twin under /en.
  const page = (
    path: string,
    priority: number,
    edited: string
  ): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path}`,
    lastModified: edited,
    changeFrequency: "monthly",
    priority,
    alternates: {
      languages: {
        vi: `${baseUrl}${path}`,
        en: `${baseUrl}/en${path}`,
        "x-default": `${baseUrl}${path}`,
      },
    },
  })
  return [
    page("", 1, LAST_EDITED.home),
    page("/terms", 0.3, LAST_EDITED.legal),
    page("/privacy", 0.3, LAST_EDITED.legal),
  ]
}
