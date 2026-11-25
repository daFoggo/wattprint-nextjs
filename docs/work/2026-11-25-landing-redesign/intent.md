# Intent: landing, auth rail and legal pages, rebuilt

Record: none (chat request, 2026-11-25)
Approval: the user delegated the calls ("tùy cứ xây đã rồi tính tiếp, theo hướng tốt nhất m đề xuất"), 2026-11-25.

## In the originator's words

- Xây lại landing từ đầu, bỏ cả navbar cũ; dùng taste-skill kết hợp hallmark và Hairline UI (MCP), hạn chế reinvent
  component, tuân thủ đúng composition; footer dùng `ridge-footer`.
- Làm lại trang auth: phần bên trái chưa có gì.
- Kết hợp thông tin dự án và ảnh thực tế dự án chạy (nhà Plegma, số đẹp nhất); kế hoạch tiết kiệm có thể mock cho đẹp.
- Xây lại điều khoản và quyền riêng tư theo các skill đó; kiểm thông tin bằng vn-law-check.
- Cập nhật Hairline mới nhất, xem hết components và blocks. Monorepo: làm cho chuẩn.

## Outcome

A visitor (competition jury, a household, an EVN partner) understands in one screen what WattPrint is (one sensor at the
breaker, each appliance in kWh and VND) and opens the demo home. Sign-in shows the product, not an empty rail. Terms and
Privacy say what the service really does with household electricity data, checked against Vietnamese law.

## Touches

`apps/web` (landing, terms, privacy, header/footer), `apps/dashboard` sign-in rail, `apps/keycloak-theme` frame rail,
`packages/ui` (Hairline update, new blocks), `docs/design-system.md` (landing section).

## Constraints

- Hairline first; vendored files only through `pnpm --filter @workspace/ui hairline` and `patch.mjs`.
- Dashboard keeps its design system; the landing gets its own art direction (user chose this, 2026-11-25).
- Never invent proof: numbers come from the pitch deck's cited sources or the running product.
- vi and en messages for every string.

## Open

- The dashboard sidebar and page header move to Hairline's `sidebar`/`page-header`: a separate change (own lane, own
  review), after this one.
