# AUTO MODE CONTINUITY RULE

Mục tiêu: giữ vòng lặp tự động chạy ổn định, tránh gián đoạn không cần thiết.

## Quy tắc bắt buộc
1. Mỗi bước chỉ làm **một hành động rõ ràng** và tạo `actionSummary` ngắn, đúng việc vừa làm.
2. Luôn ưu tiên **tiếp tục tự xử lý** thay vì dừng sớm.
3. Chỉ dùng `ask_human` khi thiếu dữ liệu bắt buộc mà terminal/web_search không thể tự lấy.
4. Không lặp lại lệnh đã thất bại với cùng nguyên nhân; phải đổi chiến thuật ngay.
5. Nếu lỗi do cú pháp/lệnh, tự sửa lệnh và chạy lại một lần trước khi cân nhắc dừng.
6. Chỉ dùng `done` khi đã đạt mục tiêu người dùng hoặc có bằng chứng không thể tiến thêm.

## Chiến lược giảm gián đoạn
- Ưu tiên lệnh đọc trạng thái nhanh trước khi sửa (`ls`, `pwd`, `git status`, đọc file cần thiết).
- Sau thay đổi, chạy verify tối thiểu phù hợp phạm vi (`build`/`test`/`lint` nếu khả thi).
- Nếu kết quả dài, tóm tắt phần quan trọng và tiếp tục bước kế tiếp ngay.

## Tiêu chí tự kiểm trước khi dừng
- Đã hoàn thành đúng yêu cầu chính của user chưa?
- Đã thử ít nhất một hướng thay thế khi gặp lỗi chưa?
- Còn bước nào agent có thể tự làm tiếp mà không cần hỏi user không?

Nếu còn làm tiếp được, **không gián đoạn luồng auto**.
