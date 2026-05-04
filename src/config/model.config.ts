export const Gemma4e4bConfig = {
    modelName: "gemma-4-e4b",
    structureResponse: {
        type: "json_schema",
        json_schema: {
            name: "tool_call",
            strict: true,
            schema: {
                type: "object",
                properties: {
                    thought: { type: "string" },
                    tool: {
                        type: "string",
                        enum: [
                            "web_search",
                            "search_grep",
                            "ask_human",
                            "read_structure",
                            "file_operation",
                            "done",
                        ],
                    },
                    parameters: {
                        type: "object",
                        properties: {
                            // Nhóm 1: Command & Search
                            command: { type: "string" },
                            mode: { type: "string", enum: ["foreground", "background"] },
                            timeout_ms: { type: "integer" },
                            verify_command: { type: "string" },
                            always_verify: { type: "boolean" },
                            log_file: { type: "string" },
                            health_check: { type: "boolean" },
                            health_timeout_ms: { type: "integer" },
                            health_interval_ms: { type: "integer" },
                            ready_pattern: { type: "string" },
                            health_url: { type: "string" },
                            health_port: { type: "integer" },
                            auto_cleanup_on_unhealthy: { type: "boolean" },
                            query: { type: "string" },
                            max_results: { type: "integer" },
                            message: { type: "string" },
                            summary: { type: "string" },

                            // Nhóm 2: File System
                            action: {
                                type: "string",
                                enum: ["read", "write", "delete", "mkdir", "list"],
                            },
                            path: { type: "string" },
                            content: { type: "string" },

                            // Nhóm 3: Debug (Đã đưa VÀO TRONG parameters)
                            type: {
                                type: "string",
                                enum: ["logs", "process", "network"],
                            },
                            lines: { type: "integer" },
                        },
                        // Quan trọng: Không để required ở đây để tránh lỗi chéo giữa các tool
                        additionalProperties: false,
                    },
                },
                required: ["thought", "tool", "parameters"],
            },
        },
    },
};