import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { LogStream } from "../src/components/hairline/log-stream.tsx"

// 01:02:03 UTC is 08:02:03 in Vietnam; the server render (not hydrated) is where the zone matters.
const lines = [{ id: "1", at: "2026-11-23T01:02:03.004Z", level: "info", message: "Bật" }]
const render = (props) => renderToString(createElement(LogStream, { defaultValue: lines, ...props }))

describe("LogStream timeZone patch", () => {
  it("formats the time in the given zone", () => {
    expect(render({ timeZone: "Asia/Ho_Chi_Minh" })).toContain("08:02:03")
  })

  it("shows UTC on the server without one", () => {
    const html = render({})
    expect(html).toContain("01:02:03")
    expect(html).not.toContain("08:02:03")
  })
})
