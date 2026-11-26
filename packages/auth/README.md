# @workspace/auth

Nhà cung cấp xác thực Keycloak (OIDC + PKCE) cho dashboard; chỉ `apps/dashboard` import. Xuất: `./config`, `./permissions`, `./types`, `./server`, `./proxy`. Phụ thuộc: `jose`, `next`, `zod`.

- `config`: đọc biến môi trường (`AUTH_PROVIDER` phải là `keycloak`, `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`).
- `keycloak/`: PKCE và đổi mã (`oidc.ts`), cookie phiên `.access` `.refresh` `.id` `.pkce` (`cookies.ts`), kiểm chữ ký bằng JWKS (`jwks.ts`), làm mới phiên (`proxy.ts`).
- `permissions`: vai trò `customer`, `editor`, `admin` và quyền như `account:view`. Vai trò lấy từ token đã kiểm, không từ dữ liệu người dùng sửa được; thiếu hoặc không rõ thì là `customer`.

Hợp đồng và quy tắc: [docs/authentication.md](../../docs/authentication.md), [docs/providers.md](../../docs/providers.md).
