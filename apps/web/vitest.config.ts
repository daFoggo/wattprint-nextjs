import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    // The rewrites read it when `next.config.ts` is imported.
    env: { DASHBOARD_ORIGIN: "http://dashboard.internal:3001" },
  },
})
