import { createElement, type ReactElement } from "react"
import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import RootError from "../[locale]/error"
import AuthError from "../[locale]/(auth)/error"
import NotFound from "../[locale]/not-found"
import GlobalError from "../global-error"
import { publicEnv } from "@/lib/env.public"
import messages from "@/messages/vi"

const render = (element: ReactElement) =>
  renderToStaticMarkup(
    createElement(NextIntlClientProvider, {
      locale: "vi",
      timeZone: "Asia/Ho_Chi_Minh",
      messages,
      children: element,
    })
  )

describe("boundaries", () => {
  it("root error renders Vietnamese copy and retry button", () => {
    const html = render(
      createElement(RootError, {
        error: new Error("test"),
        retry: () => {},
      })
    )
    expect(html).toContain("Đã có lỗi xảy ra")
    expect(html).toContain("Thử lại")
  })

  it("auth error renders Vietnamese copy and retry button", () => {
    const html = render(
      createElement(AuthError, {
        error: new Error("test"),
        retry: () => {},
      })
    )
    expect(html).toContain("Đã có lỗi xảy ra")
    expect(html).toContain("Thử lại")
  })

  it("not-found renders Vietnamese copy and links home", () => {
    const html = render(createElement(NotFound))
    expect(html).toContain("Không tìm thấy trang")
    expect(html).toContain(`href="${publicEnv.NEXT_PUBLIC_LANDING_URL}"`)
  })

  it("global error renders Vietnamese copy, lang=vi, and retry button", () => {
    const html = renderToStaticMarkup(
      createElement(GlobalError, {
        error: new Error("test"),
        retry: () => {},
      })
    )
    expect(html).toContain('lang="vi"')
    expect(html).toContain("Đã có lỗi xảy ra")
    expect(html).toContain("Thử lại")
    expect(html).not.toContain("Application error")
    expect(html.includes("dark" + ":")).toBe(false)
    expect(html).not.toContain("text-gray-500")
  })
})
