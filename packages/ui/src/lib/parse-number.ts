// shortcut: assumes `locales` groups a 4-digit number (vi, en do; es does not), check when a language is added.
/** A number typed the way `locales` writes it ("500.000" is half a million in Vietnamese); NaN when it is not one. */
export function parseNumber(text: string, locales?: string | string[]): number {
  const parts = new Intl.NumberFormat(locales).formatToParts(1000.5)
  const group = parts.find((p) => p.type === "group")?.value ?? ","
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? "."
  return parseFloat(text.split(group).join("").replace(decimal, "."))
}

/** A number as an edit box shows it in `locales`, ungrouped ("8,2" in Vietnamese), so parseNumber reads it back. */
export function editableNumber(n: number, locales?: string | string[]): string {
  return new Intl.NumberFormat(locales, { useGrouping: false, maximumFractionDigits: 20 }).format(n)
}
