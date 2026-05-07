export interface SkillMetadata {
  name: string;
  description: string; // AI sẽ đọc cái này để quyết định có chọn hay không
  keywords: string[]; // Dùng để fallback hoặc hỗ trợ lọc nhanh
}

interface ConfigProps {
  autoMode: boolean;
  modelName: string;
}

export const tools: SkillMetadata[] = [
  {
    name: 'execute_terminal',
    description: 'Execute a terminal command',
    keywords: [
      'execute',
      'terminal',
      'command',
      'thực thi',
      'lệnh',
      'hệ thống',
    ],
  },
  {
    name: 'web_search',
    description: 'Search the web',
    keywords: [
      'search',
      'web',
      'internet',
      'tìm',
      'nghiên cứu',
      'browser',
      'trình duyệt',
    ],
  },
  {
    name: 'ask_human',
    description: 'Ask the human for help',
    keywords: ['ask', 'human', 'help', 'hỏi', 'giúp', 'cần'],
  },
  {
    name: 'done',
    description: 'Done',
    keywords: ['done', 'finish', 'end', 'xong', 'hoàn thành', 'kết thúc'],
  },
];

export const SendRequestFormatConfig = ({ autoMode, modelName }: ConfigProps) => {
  if (!autoMode) {
    return {
      modelName,
      structureResponse: undefined,
    };
  }

  return {
    modelName,
    structureResponse: {
      type: 'json_schema',
      json_schema: {
        name: 'tool_call',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            thought: { type: 'string' },
            message: { type: 'string' },
            tool: {
              type: 'string',
              enum: tools.map((tool) => tool.name),
            },
            actionSummary: { type: 'string', description: "Summary this response to push in the next context" },
            parameters: {
              type: 'object',
              properties: {
                command: { type: 'string', desciption: "Terminal command response only" },
                timeout_ms: { type: 'integer', description: "Timeout set for waiting a execute action" },
                query: { type: 'string', description: "Only use by search action"  },
              },
              // Quan trọng: Không để required ở đây để tránh lỗi chéo giữa các tool
              additionalProperties: false,
            },
          },
          required: [
            'thought',
            'message',
            'tool',
            'parameters',
            'actionSummary',
          ],
        },
      },
    },
  };
};
