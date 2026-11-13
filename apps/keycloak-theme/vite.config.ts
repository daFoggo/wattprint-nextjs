import react from "@vitejs/plugin-react"
import { keycloakify } from "keycloakify/vite-plugin"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      themeName: "wattprint",
      // Login pages only; the account console stays Keycloak's (users never see it: the dashboard is the account UI).
      accountThemeImplementation: "none",
      // Read at runtime from Keycloak's environment (wattprint-backend/docker-compose.yml), exposed as kcContext.properties.
      environmentVariables: [
        { name: "WATTPRINT_LANDING_URL", default: "http://localhost:11091" },
      ],
      // Keycloak 26.2 (wattprint-backend/docker-compose.yml) reads the "all other versions" jar.
      keycloakVersionTargets: {
        "22-to-25": false,
        "all-other-versions": "wattprint-keycloak-theme.jar",
      },
    }),
  ],
})
