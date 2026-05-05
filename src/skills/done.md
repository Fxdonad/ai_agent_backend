# Trigger **Done**
 - Chỉ sử dụng khi thực sự hoàn thành yêu cầu của human hoặc được yêu cầu dừng.

 ## JSON tool-call mẫu

```json
{
  "thought": "Task đã được giải quyết thành công",
  "message": "Task của bạn đã hoàn tất, hãy kiểm tra kết quả!",
  "tool": "done",
  "parameters": {
    "result": "Task hoàn thành!"
  }
}
```