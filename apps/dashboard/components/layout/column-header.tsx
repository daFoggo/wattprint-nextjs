import { cn } from "@workspace/ui/lib/utils"

/** Header cell shared by every dashboard column: one height, so the columns line up without a rule between them. */
export function ColumnHeader({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center gap-4 px-4",
        className
      )}
    >
      {children}
    </div>
  )
}
