import { getLocale, getTranslations } from "next-intl/server"

import { publicEnv } from "@/lib/env.public"
import { jsonLd } from "@/lib/seo"

import { FAQ_KEYS } from "./faq-section"

/**
 * JSON-LD for the home page: the organisation, the product, and the FAQ section's own questions and answers (the same
 * messages, so the markup never drifts from what the page shows).
 */
export async function StructuredData() {
  const locale = await getLocale()
  const t = await getTranslations("landing")
  const url = new URL(
    locale === "en" ? "/en" : "/",
    publicEnv.NEXT_PUBLIC_APP_URL
  ).toString()
  const graph = [
    {
      "@type": "Organization",
      "@id": `${url}#organization`,
      name: "WattPrint",
      url,
      logo: new URL("/icon.svg", publicEnv.NEXT_PUBLIC_APP_URL).toString(),
    },
    {
      "@type": "SoftwareApplication",
      name: "WattPrint",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web, iOS, Android",
      description: t("meta.description"),
      inLanguage: locale,
      publisher: { "@id": `${url}#organization` },
    },
    {
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: FAQ_KEYS.map((key) => ({
        "@type": "Question",
        name: t(`faq.items.${key}.question`),
        acceptedAnswer: {
          "@type": "Answer",
          text: t(`faq.items.${key}.answer`),
        },
      })),
    },
  ]
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLd({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  )
}
