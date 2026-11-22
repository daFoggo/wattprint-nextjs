# Yêu cầu tạo bản ghi DNS cho dự án WattPrint

Nhờ anh/chị tạo 3 bản ghi trong zone `ptitai.org`:

| Tên | Loại | Giá trị | TTL |
|---|---|---|---|
| `wattprint.ptitai.org` | A | `171.226.10.152` | 300 |
| `auth.wattprint.ptitai.org` | A | `171.226.10.152` | 300 |
| `api.wattprint.ptitai.org` | A | `171.226.10.152` | 300 |

- Cả ba trỏ về cùng server với các site `*.ptitai.org` hiện có (ví dụ `vimuse.ptitai.org`).
- Chứng chỉ HTTPS sẽ được cấp bằng Let's Encrypt (HTTP-01 qua port 80). Nếu zone có bản ghi CAA, nhờ cho phép
  `letsencrypt.org`.
- Không cần wildcard và không cần bản ghi MX.

Mục đích từng tên miền:

- `wattprint.ptitai.org`: trang giới thiệu và dashboard web.
- `auth.wattprint.ptitai.org`: trang đăng nhập (Keycloak).
- `api.wattprint.ptitai.org`: API cho ứng dụng di động.

Tạo xong nhờ báo lại để bên em cấp chứng chỉ. Cảm ơn anh/chị.
