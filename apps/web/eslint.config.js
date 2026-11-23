import {
  appImportBans,
  appSyntaxRule,
} from "@workspace/eslint-config/design-system"
import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      "no-restricted-syntax": appSyntaxRule,
      "no-restricted-imports": ["error", { paths: appImportBans }],
    },
  },
]
