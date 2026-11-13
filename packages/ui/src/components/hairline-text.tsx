"use client"

import * as React from "react"

type Values = Record<string, string | number>
type Translate = (text: string, values?: Values) => string

const Dictionary = React.createContext<Record<string, string>>({})

/** Translates Hairline's built-in English strings below it; keys are the English text itself (see lib/hairline-messages). */
export function HairlineTextProvider({
  messages,
  children,
}: {
  messages: Record<string, string>
  children: React.ReactNode
}) {
  return <Dictionary.Provider value={messages}>{children}</Dictionary.Provider>
}

/** `t("{n} left", { n: 3 })`: the provider's text for this English string, or the string itself, with `{name}` filled in. */
export function useHairlineText(): Translate {
  const messages = React.useContext(Dictionary)
  return React.useCallback(
    (text, values) =>
      (messages[text] ?? text).replace(/\{(\w+)\}/g, (match, key: string) =>
        values && key in values ? String(values[key]) : match
      ),
    [messages]
  )
}
