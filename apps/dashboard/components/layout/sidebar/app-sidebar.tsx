import { cn } from "@workspace/ui/lib/utils"

/** Body under the header cell; `Sidebar` scrolls it. */
export function AppSidebarBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-8 px-2 py-6 group-data-[collapsible=icon]:gap-4">
      {children}
    </div>
  )
}

export function AppSidebarSection({
  label,
  pinned,
  children,
}: {
  label: string
  /** Push the section to the bottom of the sidebar (usage, account). */
  pinned?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      data-sidebar="group"
      className={cn(
        "relative flex flex-col",
        pinned && "mt-auto"
      )}
    >
      {/* In the icon rail the label goes; the gap between sections is the separator. */}
      <h2
        data-sidebar="group-label"
        className="mb-2 px-2 text-sm text-muted-foreground group-data-[collapsible=icon]:hidden"
      >
        {label}
      </h2>
      {children}
    </section>
  )
}
