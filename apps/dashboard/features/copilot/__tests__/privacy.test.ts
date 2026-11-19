import { describe, expect, it } from "vitest"

import vi from "../../../messages/vi/copilot.json"
import { redact } from "../privacy"

const labels = vi.privacy.labels

// The same cases as the backend's tests/test_privacy.py: both sides must find the same data.
describe("personal data in a question", () => {
  it("is replaced by its label", () => {
    expect(
      redact(
        "Gọi mình 0912 345 678 hoặc +84 28 3822 1234, mail an.nguyen@gmail.com. CCCD 001203004567," +
          " CMND: 123456789, STK 0011 0045 6789 tại VCB, thẻ 4111 1111 1111 1111.",
        labels
      )
    ).toEqual({
      text:
        "Gọi mình [số điện thoại] hoặc [số điện thoại], mail [email]. CCCD [số giấy tờ]," +
        " CMND: [số giấy tờ], STK [số tài khoản] tại VCB, thẻ [số thẻ].",
      found: ["account", "card", "email", "id", "phone"],
    })
  })

  it("leaves energy numbers alone", () => {
    for (const question of [
      "Tháng này dùng 1.250.000 đ, 212,5 kWh, bậc 4 từ 201 đến 300 số.",
      "Hóa đơn 1234567890123 có đúng không?",
      "So sánh 19/11/2026 với 0 giờ hôm qua, công tơ 123456789.",
    ])
      expect(redact(question, labels)).toEqual({ text: question, found: [] })
  })
})
