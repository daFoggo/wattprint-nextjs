# apps/keycloak-theme

Giao diện đăng nhập, đăng ký và đặt lại mật khẩu của Keycloak, viết bằng React (Keycloakify 11, Vite 8) và dùng chung token thiết kế với dashboard. Trang có sẵn: `Login`, `Register`, `LoginResetPassword`; có tiếng Việt (`src/login/i18n.vi.ts`).

## Xem trước

```bash
pnpm --filter keycloak-theme dev      # http://localhost:11098, dữ liệu giả
```

Ví dụ: `/?page=login.ftl&lang=en&error=1`.

## Build thành jar

Cần Java 21 và Maven.

```bash
pnpm --filter keycloak-theme build:jar
```

Lệnh build, đóng gói bằng Keycloakify rồi chép jar vào `wattprint-backend/keycloak/providers/` (`scripts/install-jar.mjs`). Khởi động lại Keycloak để nạp: `docker compose up -d --no-deps --force-recreate keycloak` trong backend. Jar không được commit; bản nộp mang theo bản đã build sẵn. Realm `wattprint` đặt `loginTheme` là `wattprint`.

Giao diện này không có trong đường dẫn dữ liệu của dashboard: nó chỉ hiện trên trang của Keycloak. Xem [docs/providers.md](../../docs/providers.md).
