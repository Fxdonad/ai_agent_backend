# Skill: Read Structure

Chuyên môn: khám phá nhanh cây thư mục để biết chính xác vị trí file trước/sau thay đổi.

## Khi dùng

- Trước khi tạo file/folder mới ở khu vực chưa rõ cấu trúc.
- Khi có file cần tìm mà chưa thấy thì tiếp tục truy quét vào các thư mục sâu hơn.
- Sau khi chạy lệnh sinh mã (`npm create`, script scaffold) để xác nhận kết quả.
- Khi nghi ngờ thao tác đang ở sai thư mục.

## JSON tool-call mẫu

```json
{
  "thought": "Cần xem cấu trúc thư mục src trước khi tạo module mới",
  "tool": "read_structure",
  "parameters": {
    "path": "./src"
  }
}
```

## Quy tắc sử dụng

1. Mặc định `path` là `"."` nếu không truyền.
2. Luôn kiểm tra cấu trúc trước khi ghi file vào đường dẫn mới.
3. Nếu không thấy thư mục vừa tạo, kiểm tra lại working directory và chạy lại `read_structure`.