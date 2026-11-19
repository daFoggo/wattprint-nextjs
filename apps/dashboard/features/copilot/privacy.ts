// Personal data a question does not need. The backend replaces it anyway before storing the question or sending
// it to the model (wattprint-backend app/modules/copilot/services/privacy.py, same patterns and labels); finding it
// here first lets the user choose before anything leaves the page.

export type PersonalKind = "email" | "card" | "id" | "phone" | "account"

const SEP = "[ .-]?"
const PATTERNS: [PersonalKind, RegExp][] = [
  ["email", /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g],
  ["card", /(?<!\d)\d(?:[ -]?\d){12,18}(?!\d)/g], // kept only if Luhn holds
  ["id", /(?<!\d)0\d{11}(?!\d)/g], // CCCD: 12 digits from a province code
  [
    "phone",
    new RegExp(
      `(?<![\\d+])(?:\\+?84${SEP}|0)(?:[35789](?:${SEP}\\d){8}|2(?:${SEP}\\d){9})(?!\\d)`,
      "g"
    ),
  ],
  // Digits that are personal only after a word naming them (old ID card, passport, account).
  [
    "id",
    /(?:cmnd|cccd|căn cước|chứng minh(?: nhân dân| thư)?|hộ chiếu|passport|id number)\W{0,12}([a-z]?\d{8,12})(?!\d)/giu,
  ],
  [
    "account",
    /(?:stk|số tài khoản|tài khoản(?: ngân hàng)?|account(?: number)?)\W{0,12}(\d(?:[ .-]?\d){5,18})(?!\d)/giu,
  ],
]

function luhn(digits: string) {
  let total = 0
  ;[...digits].reverse().forEach((c, i) => {
    const d = Number(c)
    total += i % 2 === 0 ? d : d > 4 ? d * 2 - 9 : d * 2
  })
  return total % 10 === 0
}

/** The text with personal data replaced by its label, and the kinds found. */
export function redact(
  text: string,
  labels: Record<PersonalKind, string>
): { text: string; found: PersonalKind[] } {
  const found = new Set<PersonalKind>()
  for (const [kind, pattern] of PATTERNS) {
    text = text.replace(pattern, (match: string, group?: unknown) => {
      const value = typeof group === "string" ? group : match
      if (kind === "card" && !luhn(value.replace(/\D/g, ""))) return match
      found.add(kind)
      return match.replace(value, labels[kind])
    })
  }
  return { text, found: [...found].sort() }
}
