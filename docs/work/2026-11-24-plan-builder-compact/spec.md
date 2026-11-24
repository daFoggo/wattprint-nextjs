# Plan builder made compact (lane M)

Record: user 2026-11-24 "cái phần ui chỗ kế hoạch tiết kiệm mặc dù ổn nhưng cứ bị dài dài to to … redesign lại …
vẫn theo quy trình cũ" — scope: the builder (no running plan); the plan's detail and progress stay.
Base: web 0714aab.

## Need
Pick 1–3 actions, see what they save on the cycle's bill, start. Each row answers "what is it, what does it save";
the tile beside it answers "what does my plan save, will it show, start".

## Problems now (prod screenshot)
- Each action row is four lines: title, device, a kWh bar, a "khoảng …" line. 4 rows ≈ 470 px.
- The summary stacks six blocks: the total, two bill bars, a clarity progress bar, a "Việc bạn sẽ làm" list that
  repeats the picked rows, a date picker with a two-line hint, the button. Empty, it is a large illustration.

## Design (Hairline: Checkbox, Tooltip, NumberRoll, Badge, DatePicker, Button; no new component fits better —
searched find_for_screen / search_components: pricing-plans, cart, balance-meter, usage-meter are heavier)
- Row: checkbox · device icon · title over device name and badges · ₫ over its kWh (the range "khoảng a–b kWh",
  or "x kWh, ước lượng sơ bộ"). The bar and the separate range line go. Below lg the ₫ and kWh sit under the title.
  No tooltips: Hairline's Tooltip never opens on touch, and the kWh/caveat must reach phones (R1).
  The always-on hint shows with its cut controls when it is picked.
- "Đã đủ 3 việc …" stays a short xs line, shown only at three.
- Tile description shortened to one line.
- Summary, one structure picked or not (no jump, no illustration): the saving (NumberRoll 3xl, 0 ₫ muted when
  nothing is picked, with "Chọn 1–3 việc …"), the kWh line, the bill as one line "old → new" with the tier badge,
  clarity as a Badge (clear / hard to see) with the "chọn thêm việc" sentence below only when hard to see, then the
  date picker (hint: the earliest day) over the button (the 5-column tile is too narrow side by side). The commitments list goes (the picked rows say it; the plan's record shows it).
- The phone's floating bar stays.

## Areas of concern
- Tooltip on a non-button trigger must stay keyboard-reachable (tabIndex).
- Message keys removed must not be used by plan-progress or the record.
- Tooltips (user, mid-change): Hairline's Tooltip is one nowrap pill, so a sentence ran as one long line (device
  certainty, forecast marks, bill forecast). Patched in packages/ui/hairline/patch.mjs: max 16rem, wraps.
