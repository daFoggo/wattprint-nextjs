import { useTranslations } from "next-intl"

import { FaqAccordion } from "@workspace/ui/components/hairline/faq-accordion"

export const FAQ_KEYS = [
  "install",
  "plugs",
  "accuracy",
  "privacy",
  "price",
  "wappi",
] as const

/** Questions in two columns: the title on the left, Hairline's accordion on the right. */
export function FaqSection() {
  const t = useTranslations("landing.faq")
  return (
    <section
      aria-labelledby="faq"
      className="max-w-lp px-lp-gutter mx-auto grid w-full grid-cols-1 gap-10 lg:grid-cols-12"
    >
      <h2
        id="faq"
        className="text-lp-head text-lp-ink font-medium text-balance lg:col-span-5"
      >
        {t("title")}
      </h2>
      <FaqAccordion
        className="lg:col-span-7"
        items={FAQ_KEYS.map((key) => ({
          id: key,
          question: t(`items.${key}.question`),
          answer: t(`items.${key}.answer`),
        }))}
      />
    </section>
  )
}
