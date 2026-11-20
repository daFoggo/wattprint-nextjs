import {
  appImportBans,
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

const featureRestrictions = layerRestrictions

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
      "no-restricted-syntax": designSyntaxRule,
      "no-restricted-imports": ["error", { paths: appImportBans }],
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
