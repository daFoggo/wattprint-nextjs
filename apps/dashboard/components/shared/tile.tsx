import { cn } from "@workspace/ui/lib/utils"

/**
 * A hand-made dashboard tile in the shell of the Hairline cards beside it (design system §8, "Dashboard tiles are
 * Hairline cards"): `rounded-3xl border bg-background`, their padding, and their header (title, a muted line, an action).
 */
export function Tile({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-5 rounded-3xl border bg-background p-4 md:p-5",
        className
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-medium">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
