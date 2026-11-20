/**
 * The docs' rules that a machine can check, so an agent or a person cannot miss them:
 * docs/design-system.md §1 (Tailwind default scale, two weights, flat) and the hairline-ui skill (icons),
 * docs/data-fetching.md §3 (no client data library), docs/internationalization.md (locale-aware navigation).
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
]

export const designSyntaxRule = [
  "error",
  ...CLASS_BANS.flatMap(([re, message]) => [
    { selector: `${CLASS_SCOPE} Literal[value=${re}]`, message },
    { selector: `${CLASS_SCOPE} TemplateElement[value.raw=${re}]`, message },
  ]),
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
]
