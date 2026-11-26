# @workspace/ui

Component và kiểu dùng chung: shadcn/ui (`base-nova`) và Hairline UI (MIT, registry shadcn). Cả ba app dùng.

```
src/components/hairline/  Hairline UI (ưu tiên dùng)
src/components/ui/        shadcn, chỉ khi Hairline không có
src/hooks/, src/lib/
src/styles/globals.css    token màu, kiểu chữ
```

Import qua `exports`, ví dụ `import { Button } from "@workspace/ui/components/hairline/button"`. Thêm Hairline: `pnpm --filter @workspace/ui hairline` (chạy `shadcn add ./items.json`), không dùng `shadcn add` trần cho Hairline. Quy tắc: [docs/design-system.md](../../docs/design-system.md).
