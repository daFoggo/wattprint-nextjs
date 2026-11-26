# @workspace/ui-patterns

Các mẫu giao diện mà cả ba app dùng chung: `app-logo`, `theme-provider`, `theme-toggle`, avatar Wappi (`wappi`), `stack-grid`, `link-button` và `ajv-browser` (bản thay thế Ajv cho trình duyệt: Ajv dùng `eval`, bị chính sách CSP của bản production chặn; dashboard trỏ `ajv/dist/2020.js` về đây).

Dựng trên `@workspace/ui`. Lệnh: `pnpm --filter @workspace/ui-patterns lint`, `typecheck`.
