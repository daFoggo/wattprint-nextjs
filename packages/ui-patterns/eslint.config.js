import {
  designSyntaxRule,
  uiImportBans,
} from "@workspace/eslint-config/design-system"
import { config } from "@workspace/eslint-config/react-internal"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    rules: {
      "no-restricted-syntax": designSyntaxRule,
      "no-restricted-imports": ["error", { paths: uiImportBans }],
    },
  },
]
