# Skill: Search Grep (Code Discovery)

Chuyên môn: tìm nhanh symbol, keyword, call-site, config trong codebase bằng `search_grep`.

## Khi dùng

- Tìm định nghĩa hàm/class/component.
- Tìm nơi một biến hoặc API được sử dụng.
- Tìm pattern lỗi trong nhiều file.

## Không dùng

- Không dùng để chỉnh sửa file (dùng `file_operation`).
- Không dùng web search cho câu hỏi có thể trả lời từ code local.

## JSON tool-call mẫu

```json
{
  "thought": "Cần tìm mọi vị trí dùng hàm createAgentPrompt trong src",
  "tool": "search_grep",
  "parameters": {
    "query": "createAgentPrompt",
    "path": "./src"
  }
}
```

## Best practices

1. Luôn giới hạn `path` khi đã biết scope để tăng tốc.
2. Ưu tiên keyword cụ thể (tên hàm, class, key config).
3. Nếu kết quả quá nhiều, chia nhỏ query theo module.