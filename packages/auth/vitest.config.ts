import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    // `config.ts` validates at import time, as the apps do at startup.
    env: {
      AUTH_PROVIDER: "keycloak",
      KEYCLOAK_CLIENT_SECRET: "test-secret",
    },
  },
})
