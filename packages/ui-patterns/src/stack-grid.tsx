import type { ComponentType, SVGProps } from "react"
import {
  IconDocker,
  IconFastapi,
  IconKeycloak,
  IconNextjs,
  IconPnpm,
  IconTailwind,
  IconTurborepo,
  IconVercel,
  IconZod,
} from "./stack-icons"

export interface StackItem {
  name: string
  category: "foundation" | "frontend" | "auth" | "backend" | "platform"
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  href?: string
}

/**
 * The technologies this repo actually depends on:
 * 1. Monorepo & runtime: Next.js, Turborepo, pnpm
 * 2. Frontend & contracts: Tailwind CSS, Zod
 * 3. Sign-in: Keycloak (Google)
 * 4. Backend: FastAPI, Docker (the Keycloak and FastAPI dev servers)
 * Vercel closes the list: the multi-zone deploy in docs/routing-and-layouts.md targets it.
 */
export const STACK_ITEMS: readonly StackItem[] = [
  { name: "Next.js", category: "foundation", Icon: IconNextjs },
  { name: "Turborepo", category: "foundation", Icon: IconTurborepo },
  { name: "pnpm", category: "foundation", Icon: IconPnpm },
  { name: "Tailwind CSS", category: "frontend", Icon: IconTailwind },
  { name: "Zod", category: "frontend", Icon: IconZod },
  { name: "Keycloak", category: "auth", Icon: IconKeycloak },
  { name: "FastAPI", category: "backend", Icon: IconFastapi },
  { name: "Docker", category: "backend", Icon: IconDocker },
  { name: "Vercel", category: "platform", Icon: IconVercel },
] as const

export interface StackGridProps {
  /** "default" for landing pages / full sections; "compact" for sidebars / auth rails */
  variant?: "default" | "compact"
  className?: string
}

/**
 * Clean hairline-bordered tech stack grid matching the reference bento design:
 * - 4 columns on sm+ viewports (9 items; 2 columns on mobile)
 * - Centered icons + brand names
 * - Subtle hover highlighting
 * - Full light/dark mode support
 */
export function StackGrid({
  variant = "default",
  className = "",
}: StackGridProps) {
  const isCompact = variant === "compact"

  return (
    <div
      className={`grid border-t border-l border-border/40 ${
        isCompact
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-4"
      } ${className}`}
    >
      {STACK_ITEMS.map((item) => (
        <div
          key={item.name}
          className={`group flex items-center justify-center border-r border-b border-border/40 transition-colors duration-150 hover:bg-muted/30 ${
            isCompact
              ? "gap-2 px-3 py-3 text-xs"
              : "gap-3 px-4 py-6 sm:px-6 sm:py-8"
          }`}
        >
          <item.Icon
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
              isCompact ? "size-4 sm:size-5" : "size-5 sm:size-6"
            }`}
          />
          <span
            className={`font-medium tracking-tight text-foreground/80 transition-colors duration-150 group-hover:text-foreground ${
              isCompact ? "text-xs" : "text-sm"
            }`}
          >
            {item.name}
          </span>
        </div>
      ))}
    </div>
  )
}
