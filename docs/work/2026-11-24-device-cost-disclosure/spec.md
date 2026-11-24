# Cost by device: forecast on demand (lane M)

Record: user feedback 2026-11-24 on the merged tile ("số liệu 2 bên khác nhau", "vừa to vừa hổ lốn", "ko reveal quá
nhiều info ngay từ đầu", "nút Thêm vào kế hoạch đ ai thấy", "đưa card ... và Dự báo hóa đơn cuối kỳ về cùng 1 hàng").
A new change after docs/work/2026-11-24-statistics-money-tiles (its loop closed).

## Need
The tile answers one question: which device costs money this cycle. Its forecast to the cycle's end, how certain it
is and how to save are wanted only on request. The two sides of the old tile showed different periods (so far vs
from now to the end) without saying so.

## Design (Hairline parts)
- `SpendingRing` without its legend; beside it (sm: two columns) one row per slice, coloured as its slice (colours
  set on the data, `--chart-1..5`), `DeviceIcon`, name, share, cost so far. A room row opens the room in the ring.
- Marks after the name, from the forecast: signal bars for certainty (`Tooltip`: level and the measured daily error)
  and a bulb when it has advice (`Tooltip`). Client component: a tooltip reads its trigger's props, which a
  server-made element lacks.
- The name is a link to the device; `HoverCard` on it: "From now to {end}: about {₫}", the kWh range and against
  usual, then the best advice with its saving and the action as a real button (`linkButton`). Touch: the link opens
  the device page, which has all of it (the card is never the only way).
- The hint says the period ("this cycle so far") and how to see the forecast.
- Row: the tile (7) beside the bill forecast (5); whole-home power alone below (12). Without a tariff the tile takes
  the row.
- `DeviceForecastRows` goes; `DeviceForecastCard` and `DeviceForecastMarks` replace it. A failed forecast read still
  throws in the tile.

## Areas of concern
1. Hover cards need a pointer; on touch the forecast is one tap away on the device page.
2. Light theme not shot (the theme is the account's choice, not the browser's).
