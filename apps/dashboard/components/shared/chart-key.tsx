export type ChartKeyItem = {
  label: string
  /** The line is drawn dashed. */
  dashed?: boolean
  /** The line is the quiet grey one (the comparison), not the main colour. */
  muted?: boolean
}

/** What a chart's lines mean, always visible: a hover readout alone leaves a dashed line unexplained. */
export function ChartKey({ items }: { items: ChartKeyItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={`w-4 border-t-2 ${item.dashed ? "border-dashed" : ""} ${item.muted ? "border-muted-foreground" : "border-primary"}`}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
