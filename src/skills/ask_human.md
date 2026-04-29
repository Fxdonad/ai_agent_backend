# Skill: Ask Human

Chuyên môn: thu thập quyết định hoặc thông tin chỉ người dùng mới cung cấp được.

## Khi dùng

1. Cần user chọn giữa nhiều hướng triển khai.
2. Cần secret/credential (API key, token, password).
3. Đã retry nhiều lần nhưng vẫn kẹt do quyền hoặc giới hạn hệ thống.
4. Trước hành động phá hủy dữ liệu (xóa lớn, reset, overwrite rủi ro cao).

## Không dùng

- Không hỏi các thông tin có thể tự kiểm tra bằng tool.
- Không dùng để trì hoãn khi có thể tự xử lý.

## JSON tool-call mẫu

```json
{
  "thought": "Cần API key để tiếp tục tích hợp dịch vụ",
  "tool": "ask_human",
  "parameters": {
    "query": "Bạn cung cấp giúp API key của dịch vụ X (có thể che bớt nếu cần)?"
  }
}
```

## Quy tắc hỏi

- Câu hỏi ngắn, 1 mục tiêu, có ngữ cảnh và bước tiếp theo sau khi nhận trả lời.