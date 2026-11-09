import { GUTTER } from "@/config/layout"
import { docsHref } from "@/config/site"

const DOCS = [
  ["project-structure.md", "Folder layout, feature slices, ESLint boundaries"],
  ["adding-a-feature.md", "The ordered checklist for a new feature"],
  ["routing-and-layouts.md", "Routes, layouts, scoped menus and the breadcrumb"],
  ["data-fetching.md", "Reads, caching, mutations, Server Actions"],
  ["authentication.md", "Sessions, the data access layer, roles"],
  ["providers.md", "Keycloak + FastAPI: realm, client, env"],
  ["design-system.md", "Tokens, type, spacing, components, motion"],
  ["client-state.md", "Zustand for client-only shared state"],
  ["performance-optimization.md", "Code splitting, Core Web Vitals"],
  ["advanced-patterns.md", "Redis cache, uploads, SSE, telemetry"],
] as const

export function DocsSection() {
  return (
    <section id="docs" className="border-b">
      <div className="border-b py-16">
        <h2 className={`${GUTTER} px-9 text-4xl font-medium tracking-tight sm:text-5xl`}>
          Docs
        </h2>
      </div>
      <div className={`${GUTTER} grid grid-cols-1 md:grid-cols-2`}>
        {DOCS.map(([file, text]) => (
          <a
            key={file}
            href={docsHref(file)}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-2 border-b p-9 transition-colors hover:bg-card md:border-r md:even:border-r-0"
          >
            <span className="text-xl font-medium tracking-tight">{file}</span>
            <span className="text-base text-muted-foreground">{text}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
