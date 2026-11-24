# Bill forecast tile compact; card links redesigned (lane M)

Record: user feedback 2026-11-24 ("card này cũng nhiều vấn đề về phân tầng thông tin", "hạn chế trình bày nhiều info
cùng lúc = plain text", "ko hiểu khoảng dự báo", "đổi icon mũi tên", "design lại các nút điều hướng ở các card",
"nút xem thống kê ... đỡ bị dài"). Also carries the R1 fixes of docs/work/2026-11-24-device-cost-disclosure.

## Requirements
1. Bill forecast tile shows: the expected bill (one figure) with a chip of the change against the last cycle (its
   amount in a tooltip); "{kWh} kWh, ends in tier {n}"; the tier path; a warning chip for the next tier (its price in
   a tooltip; "likely" wording only under 95 %). Description: "To the end of {date}".
2. The rest sits behind the model badge with an info icon (Hairline `Popover`), structured, no paragraphs: the
   P10–P90 band drawn with the expected bill marked and named, "8 in 10 chance the bill lands in this range",
   low / high labelled; then a key-value list: method, change since yesterday (signed ₫ and its main reason), past
   error (or the data basis when none).
3. `CardLink` (every card's "all X" link) becomes an outlined pill with its arrow in a muted dot that turns on hover
   (one family with `PillLink`, one step quieter). `IconLink` (client, tooltip as its name) is the dot alone, for a
   header that already holds a control: the overview device mix puts it beside its period switch instead of a link
   under the description. The device page's "Add to plan" is a `linkButton`.
4. Device cost tile R1 fixes: "simulated" shown (certainty tooltip, hover card); marks get `role="img"`; the tile
   says "this cycle" in its title and ring label as in its hint.
5. Orphaned message keys removed; keys still read elsewhere (bill overview) kept.

## Areas of concern
1. Tooltips and popovers need a pointer or focus; the figures they hold are secondary (the headline stays visible).
2. The tier path's next-tier chip and "ends in tier n" can name different tiers (the next step vs the end): both true.
