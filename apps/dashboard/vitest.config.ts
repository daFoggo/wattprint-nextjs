import { fileURLToPath } from "node:url"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    // next-intl imports `next/server` without an extension, which Node's ESM resolver rejects; Vite resolves it.
    server: { deps: { inline: ["next-intl"] } },
    exclude: [...configDefaults.exclude, "e2e/**"],
    env: {
      AUTH_PROVIDER: "keycloak",
      KEYCLOAK_CLIENT_SECRET: "test-secret",
      API_BASE_URL: "http://localhost:8099/api/v1/",
    },
  },
})
