/**
 * Hairline's built-in English strings by locale, keyed by the English text (the hairline/patch.mjs patches wrap each
 * string in `useHairlineText()`). A missing key falls back to the English, so English needs no table.
 */
export const hairlineMessages: Record<string, Record<string, string>> = {
  vi: {
    // Shared
    Close: "Đóng",
    Dismiss: "Đóng",
    Search: "Tìm kiếm",
    Day: "Ngày",
    Done: "Xong",
    "Try again": "Thử lại",
    waiting: "đang chờ",
    of: "/",
    "{left} of {limit} {unit} left": "Còn {left}/{limit} {unit}",
    "{unit} left": "{unit} còn lại",

    // Button, Skeleton
    Save: "Lưu",
    Saving: "Đang lưu",
    Saved: "Đã lưu",
    Loading: "Đang tải",

    // Toaster
    "Notifications (Alt+T)": "Thông báo (Alt+T)",

    // LogStream
    Copy: "Sao chép",
    Copied: "Đã chép",
    Live: "Trực tiếp",
    Paused: "Tạm dừng",
    "Live.": "Trực tiếp.",
    "Live. {n} lines played in.": "Trực tiếp. Đã phát {n} dòng.",
    "Paused. New lines are held.": "Tạm dừng. Dòng mới đang được giữ lại.",
    "Search {title}": "Tìm trong {title}",
    Levels: "Mức độ",
    Errors: "Lỗi",
    Warnings: "Cảnh báo",
    Info: "Thông tin",
    Debug: "Gỡ lỗi",
    "{title}, newest at the bottom": "{title}, mới nhất ở cuối",
    "Start of the log": "Đầu nhật ký",
    "Loading earlier lines": "Đang tải các dòng cũ hơn",
    "Scroll up for earlier lines": "Cuộn lên để xem dòng cũ hơn",
    "No lines match.": "Không có dòng nào khớp.",
    "Paused.": "Đã tạm dừng.",
    "Waiting for the first line…": "Đang chờ dòng đầu tiên…",
    new: "mới",

    // DonutChart
    "No data": "Chưa có dữ liệu",
    Slices: "Các phần",
    ", hidden": ", đang ẩn",

    // UsageMeter
    "No {unit} left": "Hết {unit}",
    "{summary} · resets {date}": "{summary} · đặt lại {date}",
    "You’re out until {date}.": "Đã hết cho đến {date}.",
    "the next reset": "lần đặt lại tiếp theo",
    "Resets {date}": "Đặt lại {date}",

    // TokenBucket
    ", refills {rate}": ", nạp lại {rate}",
    ", {n} waiting": ", {n} đang chờ",
    "+{n} a second": "+{n} mỗi giây",
    "+{n} a minute": "+{n} mỗi phút",
    "+1 every {n}s": "+1 mỗi {n} giây",
    "+{n} an hour": "+{n} mỗi giờ",

    // ThemeToggle
    Theme: "Giao diện",
    Light: "Sáng",
    System: "Hệ thống",
    Dark: "Tối",
    "Dark theme, switch to light": "Tối, chuyển sang giao diện sáng",
    "Light theme, switch to dark": "Sáng, chuyển sang giao diện tối",
    "Switch to light theme": "Chuyển sang giao diện sáng",
    "Switch to dark theme": "Chuyển sang giao diện tối",

    // Sparkline
    "{label}: start {start}, end {end}, upward trend.": "{label}: đầu {start}, cuối {end}, xu hướng tăng.",
    "{label}: start {start}, end {end}, downward trend.": "{label}: đầu {start}, cuối {end}, xu hướng giảm.",

    // ShareBar
    Collapse: "Thu gọn",
    Breakdown: "Chi tiết",
    Total: "Tổng",
    "{title} by share": "{title} theo tỷ trọng",

    // Avatar
    online: "trực tuyến",
    away: "vắng mặt",
    busy: "bận",
    offline: "ngoại tuyến",
    "{n} people": "{n} người",
    "and {n} more": "và {n} người khác",

    // CompareBars
    "{current} against {previous}": "{current} so với {previous}",
    "{title}, {current} against {previous}. Use the arrow keys to read each bar.":
      "{title}, {current} so với {previous}. Dùng phím mũi tên để xem từng cột.",
    "{title}, {current}. Use the arrow keys to read each bar.": "{title}, {current}. Dùng phím mũi tên để xem từng cột.",

    // ComboChart
    "{title} on {day}": "{title} ngày {day}",
    "on the {line}": "theo {line}",
    "a day on average": "trung bình mỗi ngày",
    "{title}: {bars} with the {line}. Use the arrow keys to read each day.":
      "{title}: {bars} cùng {line}. Dùng phím mũi tên để xem từng ngày.",
    "Best day": "Ngày cao nhất",
    "Daily average": "Trung bình ngày",
    "Quietest day": "Ngày thấp nhất",
    "over {n} days": "trong {n} ngày",
    "{title}: {total} over {n} days": "{title}: {total} trong {n} ngày",

    // DataTable
    "{column} for {row}": "{column} của {row}",
    "Select {row}": "Chọn {row}",
    "Close {row}": "Đóng {row}",
    "Open {row}": "Mở {row}",
    "Sorted by {column}, ascending.": "Đã sắp xếp theo {column}, tăng dần.",
    "Sorted by {column}, descending.": "Đã sắp xếp theo {column}, giảm dần.",
    "{n} selected.": "Đã chọn {n}.",
    "Selection cleared.": "Đã bỏ chọn.",
    "{n} {noun} {done}. Undo is available.": "{n} {noun}: {done}. Có thể hoàn tác.",
    removed: "đã xóa",
    "{action} failed.": "{action} không thành công.",
    "Couldn't {action} {n} {noun}. They're back.": "Không thể {action} {n} {noun}. Đã khôi phục lại.",
    "{action} failed. The rows are back.": "{action} không thành công. Các dòng đã được khôi phục.",
    "Undone. {n} {noun} back.": "Đã hoàn tác. Đã khôi phục {n} {noun}.",
    "Saved {column}.": "Đã lưu {column}.",
    "Couldn't save {column} for {row}.": "Không thể lưu {column} của {row}.",
    "Couldn't save. {column} is back to what it was.": "Không thể lưu. {column} đã trở về giá trị cũ.",
    "Page {page} of {pages}.": "Trang {page}/{pages}.",
    "Closed {row}.": "Đã đóng {row}.",
    "Opened {row}.": "Đã mở {row}.",
    Unsorted: "Không sắp xếp",
    "{column}, ascending": "{column}, tăng dần",
    "{column}, descending": "{column}, giảm dần",
    "Clear search": "Xóa tìm kiếm",
    Clear: "Xóa",
    "Caps Lock is on": "Đang bật Caps Lock",
    "Show password": "Hiện mật khẩu",
    "Hide password": "Ẩn mật khẩu",
    Weak: "Yếu",
    Fair: "Trung bình",
    Good: "Tốt",
    Strong: "Mạnh",
    "Sort by": "Sắp xếp theo",
    Sort: "Sắp xếp",
    "Clear selection": "Bỏ chọn",
    "Select all": "Chọn tất cả",
    selected: "đã chọn",
    Undo: "Hoàn tác",
    Details: "Chi tiết",
    "No {nouns} match “{query}”": "Không có {nouns} nào khớp “{query}”",
    "No {nouns} yet": "Chưa có {nouns} nào",
    "Previous page": "Trang trước",
    "Next page": "Trang sau",
  },
}
