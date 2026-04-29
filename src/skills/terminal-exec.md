# Skill: Terminal Execute (Thực thi lệnh hệ thống)

Chuyên môn: thực thi các lệnh shell/terminal một cách an toàn và hiệu quả.

## Khi dùng

- Chạy các lệnh npm, build scripts, hoặc lệnh hệ thống được whiteelist.
- Kiểm tra phiên bản công cụ hoặc trạng thái hệ thống.
- Chạy migration, seed database, hoặc công việc DevOps.
- Thực thi các lệnh git hoặc version control.
- Chạy test, lint, hoặc code quality checks.

## Không dùng

- Không chạy lệnh không được kiểm soát hoặc không rõ nguồn gốc.
- Không thực thi lệnh của người dùng trực tiếp mà không xác thực.
- Không sử dụng cho các lệnh yêu cầu interactive input (cần điều phối riêng).
- Không chạy lệnh có rủi ro cao (xóa, reset hệ thống) mà không có xác nhận.

## JSON tool-call mẫu

### Chạy lệnh npm
```json
{
  "thought": "Cần cài đặt dependencies cho project",
  "tool": "terminal_execute",
  "parameters": {
    "command": "npm install",
    "timeout": 60000,
    "description": "Cài đặt npm dependencies"
  }
}
```

### Chạy migration database
```json
{
  "thought": "Cần chạy migration để khởi tạo database",
  "tool": "terminal_execute",
  "parameters": {
    "command": "npm run migration:run",
    "timeout": 30000,
    "description": "Chạy migration khởi tạo database"
  }
}
```

### Kiểm tra Node version
```json
{
  "thought": "Cần xác nhận phiên bản Node.js đã cài",
  "tool": "terminal_execute",
  "parameters": {
    "command": "node --version",
    "timeout": 5000,
    "description": "Kiểm tra phiên bản Node.js"
  }
}
```

### Chạy lệnh git
```json
{
  "thought": "Cần commit thay đổi vào repository",
  "tool": "terminal_execute",
  "parameters": {
    "command": "git status",
    "timeout": 10000,
    "description": "Kiểm tra trạng thái git repository"
  }
}
```

## Whitelist Lệnh An toàn

Chỉ cho phép các lệnh sau được thực thi:
- **npm**: `npm install`, `npm run build`, `npm run test`, `npm run dev`, `npm run start`
- **Node.js**: `node --version`, `npx` (với package an toàn)
- **Git**: `git status`, `git log`, `git branch`, `git diff`, `git add`, `git commit`, `git push`, `git pull`
- **Database**: `npm run migration:run`, `npm run migration:revert`, `npm run seed:run`
- **Utilities**: `echo`, `pwd`, `ls`, `cat` (chỉ đọc)
- **Linting/Testing**: `npm run lint`, `npm run test`, `npm run test:e2e`

## Quy tắc Sử dụng An Toàn

1. **Luôn validate input** - Nếu command từ user input, phải whitelist hoặc sanitize.
2. **Set timeout hợp lý** - Tránh lệnh chạy vô hạn:
   - Quick check: 5-10 giây
   - Build/Install: 30-60 giây
   - Long process: 120-300 giây
3. **Xử lý lỗi chi tiết** - Phân biệt giữa:
   - Lệnh không tồn tại (command not found)
   - Lệnh thất bại (exit code != 0)
   - Timeout
   - Permission denied
4. **Log đầy đủ** - Lưu command, output, error, execution time để debug.
5. **Báo cáo rõ** - Thông báo cho user về:
   - Lệnh được chạy
   - Kết quả (success/failure)
   - Thời gian chạy
   - Bất kỳ warning hay note

## Cấu trúc Response

Trả về object với cấu trúc:
```json
{
  "success": true/false,
  "command": "npm install",
  "stdout": "output text...",
  "stderr": "error text...",
  "exitCode": 0,
  "duration": 45000,
  "message": "Mô tả kết quả cho người dùng"
}
```

## Ví dụ Lỗi Phổ Biến

### Command không được whitelist
```
❌ Command 'rm -rf /' không được phép thực thi (high-risk operation)
```

### Timeout
```
❌ Lệnh 'npm install' vượt quá timeout 60s, đã bị dừng
```

### Permission denied
```
❌ Lệnh 'docker run' yêu cầu quyền root, hiện tại không được cấp
```

### Lệnh thất bại
```
❌ Lệnh 'npm run build' thất bại với exit code 1
Stderr: Module not found: 'react'
```

## Best Practices

1. Luôn inform người dùng trước khi chạy lệnh có impact (migration, delete, deploy).
2. Chạy lệnh read-only (git status, npm list) trước khi chạy lệnh mutate.
3. Chia nhỏ workflow phức tạp thành các lệnh nhỏ, easier to debug.
4. Sử dụng `&&` trong một lệnh chỉ khi các bước phụ thuộc nhau.
5. Không assume tính khả dụng của tool (e.g., `docker`, `git`) trừ khi đã verify.
6. Luôn provide fallback hoặc hướng dẫn thủ công nếu lệnh fail.
