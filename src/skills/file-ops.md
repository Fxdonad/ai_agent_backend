# Skill: File Operation (CRUD File/Folder)

Chuyên môn: đọc, ghi, liệt kê, tạo thư mục, xóa file/folder trong workspace.

## Khi dùng

- Cần chỉnh sửa nội dung file có kiểm soát.
- Cần tạo file mới hoặc thư mục mới.
- Cần đọc file để phân tích trước khi sửa.

## Không dùng

- Không dùng để chạy build/test/dev server (dùng `execute_command`).
- Không dùng `delete` nếu chưa chắc chắn phạm vi; ưu tiên hỏi lại user.

## Action hỗ trợ

- `read`: đọc nội dung file.
- `write`: ghi đè/tạo mới file.
- `list`: liệt kê file/thư mục.
- `mkdir`: tạo thư mục.
- `delete`: xóa file/thư mục.

## JSON tool-call mẫu

```json
{
  "thought": "Cần cập nhật file cấu hình theo yêu cầu người dùng",
  "tool": "file_operation",
  "parameters": {
    "action": "write",
    "path": "src/config/app.ts",
    "content": "export const APP_NAME = \"AI Agent\";"
  }
}
```

## Quy tắc chất lượng

1. Đọc file trước khi ghi đè để tránh mất logic cũ.
2. Dùng path tương đối theo workspace để tránh ghi nhầm vị trí.
3. Với file quan trọng (`package.json`, config, env), luôn kiểm tra lại sau khi ghi.