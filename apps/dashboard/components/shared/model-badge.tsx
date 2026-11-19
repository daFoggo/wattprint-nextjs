import { useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/hairline/badge"

/** How far to trust a figure a model made, from what it was made of (each feature says why next to it). */
export type Confidence = "high" | "medium" | "low"

const TONE = { high: "success", medium: "primary", low: "warning" } as const

/** Marks a forecast or a model's estimate as such, with its confidence: no number is shown as if it were measured. */
export function ModelBadge({
  kind,
  confidence,
}: {
  kind: "forecast" | "estimate"
  confidence: Confidence
}) {
  const t = useTranslations("common.model")
  return (
    <Badge tone={TONE[confidence]} dot size="sm">
      {`${t(kind)} · ${t(`confidence.${confidence}`)}`}
    </Badge>
  )
}
