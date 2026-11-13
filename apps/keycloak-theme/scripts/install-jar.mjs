// Copies the built theme into the Keycloak providers folder that wattprint-backend/docker-compose.yml mounts.
// The backend is a sibling checkout by default; set KEYCLOAK_PROVIDERS_DIR to put the jar elsewhere.
import { copyFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import process from "node:process"

const JAR = "wattprint-keycloak-theme.jar"
const target = resolve(
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- read by this local install step, not a turbo task
  process.env.KEYCLOAK_PROVIDERS_DIR ??
    new URL("../../../../wattprint-backend/keycloak/providers", import.meta.url)
      .pathname
)
if (!existsSync(target)) {
  console.error(`No providers folder at ${target}; set KEYCLOAK_PROVIDERS_DIR.`)
  process.exit(1)
}
copyFileSync(
  new URL(`../dist_keycloak/${JAR}`, import.meta.url),
  join(target, JAR)
)
console.log(`Installed ${JAR} into ${target}. Restart Keycloak to load it.`)
