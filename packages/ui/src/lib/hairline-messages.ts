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

    // SpendingRing
    "{pct}% of spending": "{pct}% tổng chi",
    "{pct}% of {part}": "{pct}% của {part}",
    "{amount} over budget": "Vượt ngân sách {amount}",
    "of {amount} budget": "trên ngân sách {amount}",
    ", opens its parts": ", mở để xem chi tiết",
    All: "Tất cả",

    // ThresholdLine
    alert: "cảnh báo",
    alerts: "cảnh báo",
    "{label} at {value}": "{label} ở mức {value}",

    // RevenueChart
    "in {label}": "năm {label}",
    "{metric} in {month}": "{metric} · {month}",
    "in {month} {series}": "{month}, {series}",
    Measure: "Chỉ số",
    "{metric}, {current} against {previous}. Use the arrow keys to read each month.":
      "{metric}, {current} so với {previous}. Dùng phím mũi tên để đọc từng tháng.",
    Month: "Tháng",

    // SettingsForm
    "Not saved": "Chưa lưu",
    "One field needs a look.": "Một ô cần xem lại.",
    "{n} fields need a look.": "{n} ô cần xem lại.",
    "Changes saved.": "Đã lưu thay đổi.",
    "Changes saved": "Đã lưu thay đổi",
    "Your changes couldn't be saved.": "Chưa lưu được thay đổi.",
    "Changes discarded.": "Đã bỏ các thay đổi.",
    "{n} unsaved change": "{n} thay đổi chưa lưu",
    "{n} unsaved changes": "{n} thay đổi chưa lưu",
    Reset: "Hoàn tác",

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
    "{label}: start {start}, end {end}, upward trend.":
      "{label}: đầu {start}, cuối {end}, xu hướng tăng.",
    "{label}: start {start}, end {end}, downward trend.":
      "{label}: đầu {start}, cuối {end}, xu hướng giảm.",

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
    "{title}, {current}. Use the arrow keys to read each bar.":
      "{title}, {current}. Dùng phím mũi tên để xem từng cột.",

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
    "{n} {noun} {done}. Undo is available.":
      "{n} {noun}: {done}. Có thể hoàn tác.",
    removed: "đã xóa",
    "{action} failed.": "{action} không thành công.",
    "Couldn't {action} {n} {noun}. They're back.":
      "Không thể {action} {n} {noun}. Đã khôi phục lại.",
    "{action} failed. The rows are back.":
      "{action} không thành công. Các dòng đã được khôi phục.",
    "Undone. {n} {noun} back.": "Đã hoàn tác. Đã khôi phục {n} {noun}.",
    "Saved {column}.": "Đã lưu {column}.",
    "Couldn't save {column} for {row}.": "Không thể lưu {column} của {row}.",
    "Couldn't save. {column} is back to what it was.":
      "Không thể lưu. {column} đã trở về giá trị cũ.",
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

    // ChatHistory
    "New chat": "Cuộc trò chuyện mới",
    "Pin {title}": "Ghim {title}",
    "Unpin {title}": "Bỏ ghim {title}",
    "Rename {title}": "Đổi tên {title}",
    "Delete {title}": "Xóa {title}",
    "Chat title": "Tên cuộc trò chuyện",
    "Save title": "Lưu tên",
    "Chat deleted": "Đã xóa cuộc trò chuyện",
    "Chat history": "Lịch sử trò chuyện",
    "Search chats": "Tìm cuộc trò chuyện",
    "No chats match “{query}”": "Không có cuộc trò chuyện nào khớp “{query}”",
    "No chats yet": "Chưa có cuộc trò chuyện nào",
    Pinned: "Đã ghim",
    Today: "Hôm nay",
    Yesterday: "Hôm qua",
    "Previous 7 days": "7 ngày trước",
    "Previous 30 days": "30 ngày trước",
    // The locale ChatHistory names older months in (not shown as text).
    "en-US": "vi-VN",

    // ChatScroll
    Conversation: "Cuộc trò chuyện",
    "Still writing below. Jump to latest": "Đang viết tiếp bên dưới. Xuống tin mới nhất",
    "New reply below. Jump to latest": "Có câu trả lời mới bên dưới. Xuống tin mới nhất",
    "Jump to latest": "Xuống tin mới nhất",
    Writing: "Đang viết",
    "New reply": "Câu trả lời mới",

    // StreamingAnswer
    Stopped: "Đã dừng",
    "The answer was interrupted.": "Câu trả lời bị gián đoạn.",
    Retry: "Thử lại",
    source: "nguồn",
    sources: "nguồn",
    "Copy answer": "Sao chép câu trả lời",
    Regenerate: "Tạo lại",
    Helpful: "Hữu ích",
    "Not helpful": "Chưa hữu ích",
    "Follow-ups": "Hỏi tiếp",

    // ThinkingTrace, ThinkingIndicator
    Thinking: "Đang suy nghĩ",
    "Searching the web": "Đang tìm trên web",
    "Running tools": "Đang chạy công cụ",
    "Couldn’t finish": "Chưa hoàn thành được",
    "Searched the web": "Đã tìm trên web",
    "Ran {n} tool": "Đã chạy {n} công cụ",
    "Ran {n} tools": "Đã chạy {n} công cụ",
    "Thought for": "Đã suy nghĩ trong",
    "Thought it through": "Đã suy nghĩ xong",
    "+{n} more": "+{n} mục khác",
    "Done in": "Xong trong",

    // ToolCall
    Preparing: "Đang chuẩn bị",
    Running: "Đang chạy",
    Failed: "Lỗi",
    Denied: "Bị từ chối",
    Input: "Đầu vào",
    Output: "Kết quả",

    // Plan
    Plan: "Kế hoạch",
    done: "xong",
    "{done} of {total}": "{done}/{total}",
    "{done} of {total} done": "Xong {done}/{total}",
    "Not started": "Chưa bắt đầu",
    "In progress": "Đang làm",
    Skipped: "Bỏ qua",

    // ApprovalCard
    "Needs your approval": "Cần bạn duyệt",
    Approved: "Đã duyệt",
    Expired: "Hết hạn",
    "Approval needed: {title}": "Cần duyệt: {title}",
    "Time left: ": "Thời gian còn lại: ",
    Approve: "Duyệt",
    Deny: "Từ chối",

    // ClarifyingQuestion
    "Something else": "Ý khác",
    "the agent will decide": "trợ lý sẽ tự quyết định",
    "Skipped, {reason}": "Đã bỏ qua, {reason}",
    "Needs your answer": "Cần bạn trả lời",
    "Type your answer": "Nhập câu trả lời",
    "Send answer": "Gửi câu trả lời",
    Skip: "Bỏ qua",
    Continue: "Tiếp tục",

    // PromptComposer
    "Ask anything": "Hỏi bất cứ điều gì",
    "Attach files": "Đính kèm tệp",
    Stop: "Dừng",
    Sending: "Đang gửi",
    Send: "Gửi",
    "Drop files to attach": "Thả tệp để đính kèm",

    // VoiceInput
    Dictate: "Đọc để nhập",
    "Stop and transcribe": "Dừng và chuyển thành chữ",
    Transcribing: "Đang chuyển thành chữ",
    Listening: "Đang nghe",
    "Microphone blocked": "Micro bị chặn",
    "Didn’t catch that": "Chưa nghe rõ",
    Cancel: "Hủy",
    "Allow the microphone in your browser’s site settings, then try again.":
      "Hãy cho phép micro trong cài đặt trang web của trình duyệt, rồi thử lại.",
    "Speak a little closer to the microphone.": "Hãy nói gần micro hơn một chút.",

    // VoiceTalk (and the VoiceError messages of voice-session)
    "Microphone access is blocked. Allow it from the icon in the address bar, then try again.":
      "Quyền dùng micro đang bị chặn. Hãy cho phép từ biểu tượng trên thanh địa chỉ, rồi thử lại.",
    "No microphone was found. Plug one in or pick one in your system settings.":
      "Không tìm thấy micro. Hãy cắm micro hoặc chọn micro trong cài đặt hệ thống.",
    "This browser can't record audio on this page. It needs a secure (https) page and a recent browser.":
      "Trình duyệt này không ghi âm được trên trang này. Cần trang bảo mật (https) và trình duyệt mới.",
    "Microphone access was blocked.": "Quyền dùng micro đã bị chặn.",
    "No microphone was found.": "Không tìm thấy micro.",
    "This browser can't record audio here.": "Trình duyệt này không ghi âm được ở đây.",
    "Recording needs a secure (https) page.": "Cần trang bảo mật (https) để ghi âm.",
    "This browser can't record audio.": "Trình duyệt này không ghi âm được.",
    "Didn't hear anything.": "Chưa nghe thấy gì.",
    "Couldn't play the reply.": "Không phát được câu trả lời.",
    "The assistant didn't answer.": "Trợ lý chưa trả lời.",
    "Couldn't connect.": "Không kết nối được.",
    Speaking: "Đang nói",

    // CodeBlock
    code: "mã",
    Code: "Mã",
    "Wrap lines": "Xuống dòng",
    "Couldn’t copy": "Không sao chép được",
    "Copy code": "Sao chép mã",
    Apply: "Áp dụng",
    Applying: "Đang áp dụng",
    Applied: "Đã áp dụng",
    "Show less": "Thu gọn",
    "Show {n} more line": "Hiện thêm {n} dòng",
    "Show {n} more lines": "Hiện thêm {n} dòng",
  },
}
