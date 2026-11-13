import type { MetadataRoute } from "next"

import { publicEnv } from "@/lib/env.public"

const unconfigured =
  process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL

export default function sitemap(): MetadataRoute.Sitemap {
  if (unconfigured) return []
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL

  // Each page in Vietnamese (no prefix) with its English twin under /en.
  const page = (
    path: string,
    priority: number
  ): MetadataRoute.Sitemap[number] => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority,
    alternates: {
      languages: { vi: `${baseUrl}${path}`, en: `${baseUrl}/en${path}` },
    },
  })
  return [page("", 1), page("/terms", 0.3), page("/privacy", 0.3)]
}
