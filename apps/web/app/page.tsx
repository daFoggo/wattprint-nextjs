import { CommandsSection } from "@/components/sections/commands-section"
import { DocsSection } from "@/components/sections/docs-section"
import { Footer } from "@/components/sections/footer"
import { Header } from "@/components/sections/header"
import { HeroSection } from "@/components/sections/hero-section"
import { OverviewSection } from "@/components/sections/overview-section"

/**
 * Landing page: full-bleed bands cut by hairlines, with two vertical rails along the content edge. Colors come from the
 * theme tokens only (docs/design-system.md, Landing layout).
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <div className="relative isolate">
        <main>
          <HeroSection />
          <CommandsSection />
          <OverviewSection />
          <DocsSection />
        </main>
        <Footer />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-5 inset-y-0 -z-10 border-x md:inset-x-9"
        />
      </div>
    </>
  )
}
