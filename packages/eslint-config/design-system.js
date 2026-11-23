/**
 * The docs' rules that a machine can check, so an agent or a person cannot miss them:
 * docs/design-system.md §1 (Tailwind default scale, two weights, flat) and the hairline-ui skill (icons),
 * docs/data-fetching.md §3 (no client data library), docs/internationalization.md (locale-aware navigation,
 * no hardcoded UI text or locale), docs/design-system.md §3 (fonts load once in @workspace/ui/lib/fonts).
 * A deliberate exception gets `// eslint-disable-next-line <rule> -- <reason with its doc>`.
 */

// Strings that hold Tailwind classes: className-like props and the class helpers.
const CLASS_SCOPE =
  ":matches(JSXAttribute[name.name=/[cC]lassName$/], CallExpression[callee.name=/^(cn|cva|clsx)$/])"

const CLASS_BANS = [
  // `-[...]` is a value (`mt-[54px]`, `bg-[#123]/50`) unless a variant follows: `data-[state=open]:` or the
  // named-group form `group-data-[state=open]/item:`.
  [
    /-\[[^\]]*\](?!:|\/[\w-]+:)/,
    "No arbitrary Tailwind values: use the nearest default step (docs/design-system.md §1).",
  ],
  [
    /(^|[\s:])font-(thin|extralight|light|semibold|bold|extrabold|black)(\s|$)/,
    "Weights are font-normal and font-medium only (docs/design-system.md §1).",
  ],
  [
    /(^|[\s:])(shadow(?!-none)(?=-|\s|$)|drop-shadow|backdrop-blur)/,
    "The design is flat: no shadows or blur (docs/design-system.md §1).",
  ],
  [
    /(^|[\s:])dark:(bg|text|border|ring|outline|fill|stroke|from|via|to|divide|decoration|caret|accent|placeholder)-/,
    "Style through the theme tokens, not dark: color pairs; both themes come from globals.css (docs/design-system.md §1, §2).",
  ],
]

export const designSyntaxRule = [
  "error",
  ...CLASS_BANS.flatMap(([re, message]) => [
    { selector: `${CLASS_SCOPE} Literal[value=${re}]`, message },
    { selector: `${CLASS_SCOPE} TemplateElement[value.raw=${re}]`, message },
  ]),
]

/**
 * For the apps: UI text comes from messages/{vi,en} and numbers and dates format with the current locale
 * (docs/internationalization.md, Writing UI text). Units (kWh) and single symbols are not text.
 */
const TEXT_MESSAGE =
  "No hardcoded UI text: add it to messages/{vi,en}/<namespace>.json and use useTranslations/getTranslations (docs/internationalization.md)."
const LOCALE_MESSAGE =
  "Format with the current locale (useLocale()/getLocale()), never a hardcoded one (docs/internationalization.md)."

export const appSyntaxRule = [
  ...designSyntaxRule,
  { selector: "JSXText[value=/(?!kWh\\b)\\p{L}{3,}/u]", message: TEXT_MESSAGE },
  {
    selector:
      "JSXAttribute[name.name=/^(aria-label|placeholder|title|alt|label|description)$/] > Literal[value=/(?!kWh\\b)\\p{L}{3,}/u]",
    message: TEXT_MESSAGE,
  },
  {
    selector:
      "NewExpression[callee.object.name='Intl'][arguments.0.type='Literal']",
    message: LOCALE_MESSAGE,
  },
  {
    selector:
      "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/][arguments.0.type='Literal']",
    message: LOCALE_MESSAGE,
  },
]

/** For every package with UI code. */
export const uiImportBans = [
  {
    name: "lucide-react",
    message: "App code uses @tabler/icons-react (hairline-ui skill).",
  },
  {
    name: "@tanstack/react-query",
    message:
      "Server-first: read in Server Components, write in Server Actions (docs/data-fetching.md §3).",
  },
  {
    name: "swr",
    message:
      "Server-first: read in Server Components, write in Server Actions (docs/data-fetching.md §3).",
  },
]

/** For the apps, which route through next-intl. */
export const appImportBans = [
  ...uiImportBans,
  {
    name: "next/link",
    message:
      "Use Link from @/i18n/navigation; next/link drops /en (docs/internationalization.md).",
  },
  {
    name: "next/navigation",
    importNames: ["redirect", "permanentRedirect", "usePathname", "useRouter"],
    message:
      "Use @/i18n/navigation; next/navigation drops /en. External URLs and route handlers outside [locale] are the exception (docs/internationalization.md).",
  },
  ...["next/font/google", "next/font/local"].map((name) => ({
    name,
    message:
      "Fonts load once in @workspace/ui/lib/fonts; do not load fonts per app (docs/design-system.md §3).",
  })),
]
