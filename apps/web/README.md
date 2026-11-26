# apps/web

Trang giới thiệu công khai của WattPrint. Next.js 16.4, React 19, next-intl. Không có bí mật. Cổng dev 11091 (prod 11081).

## Chạy

```bash
cp .env.example .env.local
pnpm --filter web dev
```

| Biến | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL của trang này (`http://localhost:11091`). Bắt buộc khi build production: thiếu thì robots.txt chặn mọi trình thu thập |
| `NEXT_PUBLIC_DASHBOARD_URL` | Nơi nút "Đăng nhập" và "Bắt đầu" dẫn tới |
| `DASHBOARD_ORIGIN` | Gốc của `apps/dashboard` mà các rewrite trỏ tới |

## Multi-zone

`next.config.ts` chuyển `sign-in`, `dashboard`, `auth` và `/dashboard-static/*` sang `DASHBOARD_ORIGIN`, nên dưới một tên miền người dùng thấy cả trang giới thiệu lẫn dashboard.

Route: `app/[locale]/page.tsx` (trang chủ), `privacy`, `terms`. Lệnh: `pnpm --filter web build`, `typecheck`, `test`.
