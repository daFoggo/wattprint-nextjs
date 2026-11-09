import { StackGrid } from "@workspace/ui-patterns/stack-grid"

import { GUTTER } from "@/config/layout"
import { docsHref } from "@/config/site"

const TREE = [
  ["apps/dashboard", "signed-in app: auth, shell, features/"],
  ["apps/web", "this landing page"],
  ["packages/auth", "Keycloak sign-in provider"],
  ["packages/ui", "shadcn and Animate UI components, theme tokens"],
  ["packages/ui-patterns", "composed UI both apps share"],
  ["docs/", "the standards: read before changing an area"],
] as const

export function OverviewSection() {
  return (
    <section id="overview" className="border-b">
      <div className="border-b py-16">
        <h2 className={`${GUTTER} px-9 text-4xl font-medium tracking-tight sm:text-5xl`}>
          Stack
        </h2>
      </div>
      <div className={`${GUTTER} px-9 py-12`}>
        <StackGrid />
      </div>
      <div className="border-y py-16">
        <h2 className={`${GUTTER} px-9 text-4xl font-medium tracking-tight sm:text-5xl`}>
          Architecture
        </h2>
      </div>
      <div className={`${GUTTER} px-9 py-12`}>
        <div className="flex flex-col gap-2 border bg-card p-6 font-mono text-sm">
          {TREE.map(([path, note]) => (
            <div key={path} className="flex flex-col gap-1 sm:flex-row sm:gap-6">
              <span className="w-56 shrink-0">{path}</span>
              <span className="text-muted-foreground">{note}</span>
            </div>
          ))}
        </div>
        <a
          href={docsHref("project-structure.md")}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-base font-medium underline underline-offset-4"
        >
          Read project-structure.md
        </a>
      </div>
    </section>
  )
}
