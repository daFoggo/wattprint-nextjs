// One colour per tier everywhere (ShareBar ranks its parts, so they would recolour by size).
// Only --chart-1..5 exist; the old tariff has 6 tiers, so wrap around.
export const tierColor = (n: number) => `var(--chart-${((n - 1) % 5) + 1})`
