import { SegmentedControl } from "@workspace/ui/components/hairline/segmented-control"

import type { I18n } from "../i18n"

/** VI | EN, as in the apps. Keycloak switches language through its own links (`kc_locale`), so a choice is a page load. */
export function LocaleSwitch({ i18n }: { i18n: I18n }) {
  const { enabledLanguages, currentLanguage, msgStr } = i18n
  if (enabledLanguages.length < 2) return null
  return (
    <SegmentedControl
      label={msgStr("languageLabel")}
      size="sm"
      className="ml-auto"
      value={currentLanguage.languageTag}
      onValueChange={(tag) => {
        const target = enabledLanguages.find((l) => l.languageTag === tag)
        if (target) window.location.href = target.href
      }}
      // Vietnamese first, as in the apps (Keycloak lists languages alphabetically).
      options={[...enabledLanguages]
        .sort((a, b) =>
          a.languageTag === "vi" ? -1 : b.languageTag === "vi" ? 1 : 0
        )
        .map(({ languageTag, label }) => ({
          value: languageTag,
          label: languageTag.toUpperCase(),
          ariaLabel: label,
        }))}
    />
  )
}
