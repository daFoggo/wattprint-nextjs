"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    // Renders outside the locale layout (no next-intl): Vietnamese first, a short English line.
    <html lang="vi">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "Canvas",
          color: "CanvasText",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          Đã có lỗi xảy ra
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            margin: 0,
            opacity: 0.75,
            maxWidth: "24rem",
          }}
        >
          Hệ thống gặp lỗi nghiêm trọng. Vui lòng tải lại trang hoặc thử lại.
          <br />
          <span lang="en">Something went wrong. Please reload the page.</span>
        </p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            cursor: "pointer",
            borderRadius: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            background: "CanvasText",
            color: "Canvas",
            border: "none",
          }}
        >
          Thử lại
        </button>
      </body>
    </html>
  )
}
