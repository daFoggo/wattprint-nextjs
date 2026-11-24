# Statistics: money tiles tidied (lane M)

Record: user feedback 2026-11-24 ("card dự báo ... xấu", "gom lại cùng cái card device", "bỏ title Money",
"xóa card Tiền điện từng tháng", "đẩy Tiền điện tháng này theo thiết bị lên đầu").

## Goal
The statistics page's money row reads at a glance and takes less room.

## Requirements
1. Bill forecast tile: one headline figure (the expected bill), under it "{kWh} kWh, ends in tier {n}" (replaces the
   three equal stats whose "Tier 3 / Ends in" pair read wrongly), the P10–P90 range when the model made it, then a
   tier path: the tiers as one bar up to the end of the tier the cycle ends in (an open top tier: 10 % past the
   expected kWh), each tier in its colour, solid to the kWh used, half to the kWh expected, faint beyond, labelled by
   tier, with "used so far" and "expected by {date}" in kWh. The accuracy line sits at the tile's foot.
   `tierPath` (features/billing/forecast.ts) computes it, with Vitest cases.
2. The separate "Each device to the end of the cycle" tile is gone: its rows (compact: name as the link to the device,
   certainty, against usual, best advice; amount and kWh range on the right) sit inside "This month's cost by device"
   beside the ring (lg: 5 | 7 columns; stacked below lg), full width. A failed device-forecast read still throws where
   the rows go; with no forecast the ring takes the tile alone.
3. The "Money" and "Energy" group headings are removed (the peers heading stays).
5. The month-by-month cost tile (`BillHistory`, used only here) is deleted with its messages (`billing.history`).
   Order: cost by device (12) first; then the bill forecast (5) beside whole-home power (7; 12 without a tariff,
   when the forecast does not render); then the energy tiles as before.
4. Copy in en and vi; keys orphaned by this change removed.

## Areas of concern
1. The ring and the rows both list the devices (this month vs to the cycle's end): accepted, they answer different
   questions, and the rows replace a whole tile.
2. Tier colours repeat after tier 5 (`tierColor` wraps): the path only spans up to the ending tier.
