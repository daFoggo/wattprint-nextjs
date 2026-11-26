# apps/dashboard

Đăng nhập và dashboard của WattPrint. Next.js 16.4, React 19, next-intl, Zod 4, Vitest và Playwright. Cổng dev 11092 (prod 11082).

Chạy và cấu hình môi trường: xem [README gốc](../../README.md#cài-đặt). Ứng dụng đọc `apps/dashboard/.env.local` (mẫu `.env.example`).

## Trang

Đường dẫn thật dưới `app/[locale]/` (hằng số ở `config/routes.ts`):

| Đường dẫn | Nội dung |
|---|---|
| `/sign-in` | Đăng nhập (Keycloak), nút **Xem nhà demo** |
| `/dashboard` | Tổng quan |
| `/dashboard/statistics` | Thống kê |
| `/dashboard/devices`, `/dashboard/devices/[id]` | Thiết bị và chi tiết từng thiết bị |
| `/dashboard/alerts` | Cảnh báo |
| `/dashboard/plan`, `/dashboard/plan/history`, `/dashboard/plan/[id]` | Kế hoạch tiết kiệm |
| `/dashboard/bill` | Hóa đơn |
| `/dashboard/settings` | Cài đặt nhà |
| `/dashboard/copilot` | Trò chuyện với Wappi (nhóm route `(chat)`) |
| `/auth/callback`, `/auth/expired` | Đổi mã OIDC lấy token; xóa phiên khi API trả 401 |
| `/api/copilot/chat`, `/api/copilot/voice/speech`, `/api/copilot/voice/transcribe` | Cầu nối tới backend cho chat (SSE) và giọng nói; kiểm quyền `account:view`, token không ra trình duyệt |

## Cấu trúc

```
app/            route (App Router, [locale])
features/<tên>/ một thư mục cho mỗi miền: auth, home, energy, billing, insight, plan, weather, copilot
                (components, server.ts, queries.ts, actions.ts, schemas.ts, __tests__)
lib/            http.ts (apiFetch), dal.ts (phiên và quyền), env.ts, clock.ts
config/         routes, navigation, auth
i18n/, messages/{vi,en}/
proxy.ts        làm mới token, chặn /dashboard khi chưa đăng nhập, next-intl
```

Quy ước từng thư mục: [features/README.md](features/README.md), [config/README.md](config/README.md), [lib/README.md](lib/README.md).

## Lệnh

```bash
pnpm --filter dashboard dev          # :11092
pnpm --filter dashboard build
pnpm --filter dashboard typecheck
pnpm --filter dashboard test         # vitest
pnpm --filter dashboard test:e2e     # playwright, cần BASE_URL
```
