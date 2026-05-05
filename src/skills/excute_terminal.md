# Hướng dẫn sử dụng công cụ: `execute_terminal`

Chào Agent, bạn có quyền truy cập vào hệ thống Ubuntu thông qua công cụ `execute_terminal`. Để hoàn thành nhiệm vụ một cách chuyên nghiệp và chính xác, hãy tuân thủ các chỉ dẫn dưới đây.

## 1. Nguyên tắc hoạt động
Mỗi khi bạn thực thi một lệnh, hệ thống sẽ trả về kết quả bao gồm:
*   **[CWD]**: Thư mục hiện tại bạn đang đứng.
*   **[Stdout]**: Kết quả đầu ra nếu lệnh thành công.
*   **[Stderr]**: Thông báo lỗi nếu lệnh thất bại.

## 2. Các lệnh Ubuntu ưu tiên sử dụng

### A. Khám phá hệ thống (Exploration)
Trước khi chỉnh sửa code, bạn **bắt buộc** phải hiểu cấu trúc dự án.
*   **Xem thư mục hiện tại:** `pwd`
*   **Liệt kê file (tránh node_modules):** `find . -maxdepth 2 -not -path '*/.*' -not -path '*node_modules*'`
*   **Kiểm tra nội dung file:** `cat path/to/file.ts` hoặc `head -n 50 file.txt` (nếu file quá lớn).

### B. Tìm kiếm thông tin (Searching)
*   **Tìm chuỗi trong code:** `grep -rnI "keyword" .`
*   **Tìm file theo tên:** `find . -name "*.service.ts"`

### C. Quản lý tiến trình & Dependencies
*   **Kiểm tra phiên bản:** `node -v`, `npm -v`
*   **Cài đặt package:** `npm install <package_name>`
*   **Chạy test:** `npm test` hoặc `npx jest <path_ref>`

## 3. Quy trình Xử lý Lỗi (Error Handling)
Nếu kết quả trả về có chứa `[Stderr]` hoặc `Exit Code != 0`, bạn không được bỏ qua. Hãy thực hiện các bước sau:

1.  **Phân tích lỗi:** Đọc kỹ `[Stderr]`. Nếu là `Permission denied`, hãy kiểm tra quyền. Nếu là `No such file`, hãy dùng `pwd` và `ls` để xác nhận lại vị trí.
2.  **Sửa lỗi:** Thay đổi tham số lệnh hoặc sử dụng lệnh bổ trợ để khắc phục.
3.  **Thử lại:** Thực hiện lại lệnh đã sửa.

## 4. Định dạng phản hồi (JSON Schema)
Bạn phải luôn phản hồi theo cấu trúc JSON mà `Gemma4e4bConfig` yêu cầu. 

**Ví dụ: Khi bạn muốn xem cấu trúc thư mục để bắt đầu nhiệm vụ:**
```json
{
  "thought": "Tôi cần kiểm tra cấu trúc thư mục hiện tại để xác định vị trí của các file source code trước khi thực hiện yêu cầu.",
  "message": "Tôi sẽ kiểm tra cấu trúc để xác định vị trí...",
  "tool": "execute_terminal",
  "parameters": {
    "command": "find . -maxdepth 2 -not -path '*/.*' -not -path '*node_modules*'",
    "timeout_ms": 10000
  }
}
```

## 5. Các điều cấm và hạn chế (Safety)
*   **Không** thực thi các lệnh tương tác đợi nhập liệu (ví dụ: `nano`, `vim`, hoặc lệnh yêu cầu `y/n` mà không có flag `-y`).
*   **Không** chạy các tiến trình chạy ngầm (background) mà không có điểm kết thúc rõ ràng trừ khi được yêu cầu.
*   **Luôn ưu tiên** các lệnh đọc (`read-only`) trước khi thực hiện các lệnh ghi hoặc xóa (`write/delete`).

---

### Mẹo cho Agent:
*   Nếu bạn thấy `[CWD]` không như mong đợi, hãy nhớ rằng mỗi lệnh `execute_terminal` có thể chạy trong một shell riêng biệt tùy vào cấu hình hệ thống. Luôn sử dụng đường dẫn tương đối từ gốc dự án hoặc kiểm tra `pwd` thường xuyên.
*   Sử dụng lệnh `grep` kết hợp với `head` để tránh nhận về lượng dữ liệu quá lớn làm tràn ngữ cảnh (context window).