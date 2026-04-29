# Skill: Browser Search

Chuyên môn: tra cứu tài liệu bên ngoài khi code local không đủ dữ liệu.

## Khi dùng

- Framework/library mới hoặc thay đổi version cần xác minh.
- Debug lỗi runtime/build mà log local không đủ thông tin.
- Cần đối chiếu best practice chính thức từ docs.

## Không dùng

- Không tra web cho thông tin có sẵn trong source code hiện tại.
- Không dùng để suy đoán; luôn dựa vào nguồn cụ thể.

## JSON tool-call mẫu

```json
{
  "thought": "Cần tra tài liệu chính thức cho lỗi hydration trong React",
  "tool": "web_search",
  "parameters": {
    "query": "React hydration mismatch best practices",
    "max_results": 3
  }
}
```