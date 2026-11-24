import {
  appImportBans,
  appSyntaxRule,
  designSyntaxRule,
} from "@workspace/eslint-config/design-system"
import { nextJsConfig } from "@workspace/eslint-config/next-js"

const layerRestrictions = [
  {
    group: ["@/app", "@/app/**"],
    message: "features/ must not import from app/.",
  },
  {
    group: ["@/features", "@/features/**"],
    message:
      "Features must not import other features. Compose them in app/, and use relative imports inside a feature.",
  },
]

const featureRestrictions = [
  ...layerRestrictions,
  {
    // Only the DAL and lib/env read secrets (docs/data-fetching.md §2); a feature asks the DAL.
    group: ["@/lib/env", "@workspace/auth/config"],
    message: "Features never read secrets: get them from @/lib/dal.",
  },
]

// docs/data-fetching.md §5.1: every "use cache" scope calls cacheLife.
const dashboardSyntaxRule = [
  ...appSyntaxRule,
  {
    selector:
      ":function:has(ExpressionStatement[directive=/^use cache/]):not(:has(CallExpression[callee.name='cacheLife']))",
    message:
      'Always call cacheLife() with "use cache" (docs/data-fetching.md §5.1).',
  },
]

// A rule that flags the whole file (a missing directive, a forbidden file name).
const fileRule = (selector, message) => [
  "error",
  ...dashboardSyntaxRule.slice(1),
  { selector, message },
]

const authRestrictedGroup = [
  "@/lib/auth",
  "@/lib/env",
  "@workspace/auth/server",
  "@workspace/auth/config",
]

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      "no-restricted-syntax": dashboardSyntaxRule,
      "no-restricted-imports": ["error", { paths: appImportBans }],
    },
  },
  {
    // global-error replaces the root layout: no messages provider and no theme there (docs/design-system.md §1).
    files: ["app/global-error.tsx"],
    rules: { "no-restricted-syntax": designSyntaxRule },
  },
  {
    files: ["features/*/server.ts", "features/*/queries.ts"],
    rules: {
      "no-restricted-syntax": fileRule(
        "Program:not(:has(ImportDeclaration[source.value='server-only']))",
        'server.ts and queries.ts start with import "server-only" (docs/adding-a-feature.md).'
      ),
    },
  },
  {
    files: ["features/*/actions.ts"],
    rules: {
      "no-restricted-syntax": fileRule(
        "Program:not(:has(> ExpressionStatement[directive='use server']))",
        'actions.ts starts with "use server" (docs/adding-a-feature.md).'
      ),
    },
  },
  {
    files: ["**/index.ts", "**/index.tsx"],
    rules: {
      "no-restricted-syntax": fileRule(
        "Program",
        "No barrel index.ts: import the file you need (features/README.md)."
      ),
    },
  },
  {
    files: ["features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: appImportBans, patterns: featureRestrictions },
      ],
    },
  },
  {
    // Declared after the block above so this rule set replaces it for components/.
    files: ["features/*/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: appImportBans,
          patterns: [
            ...featureRestrictions,
            {
              group: [
                "**/server",
                "**/server.*",
                "**/queries",
                "@/lib/dal",
                "@/lib/http",
                ...authRestrictedGroup,
              ],
              message:
                "Feature components must not import server-only modules (server, queries, dal, http, auth).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["app/**/page.tsx", "app/**/layout.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: appImportBans,
          patterns: [
            {
              group: ["@/features/*/server", "@/features/*/server.*"],
              message:
                "Pages never import server.ts: read through the feature's queries.ts (docs/adding-a-feature.md §7).",
            },
          ],
        },
      ],
    },
  },
  {
    // App shell components may be client components; auth config holds secrets.
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: appImportBans,
          patterns: [
            {
              group: ["@/lib/dal", "@/lib/http", ...authRestrictedGroup],
              message:
                "Shared components must not import server-only modules (dal, http, auth).",
            },
          ],
        },
      ],
    },
  },
]
