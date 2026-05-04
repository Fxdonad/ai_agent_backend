// src/modules/agent/agent.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import env from '../environment';
import { TerminalService, TerminalExecutionResult } from './terminal.service';
import { SkillLoaderService } from './skill-loader.service';
import { HistoryService } from 'src/service/history.service';
import { Gemma4e4bConfig } from 'src/config/model.config';

/**
 * Agent Service - Orchestrates LLM interaction with Terminal execution
 */
@Injectable()
export class AgentService {
    private currentSessionId: string;
    private readonly logger = new Logger(AgentService.name);
    private readonly MAX_STEPS = 100;

    constructor(
        private terminal: TerminalService,
        private skillLoader: SkillLoaderService,
        private historyService: HistoryService,
    ) { }

    /**
     * Khởi tạo phiên làm việc mới
     */
    async initSession() {
        try {
            const session = await this.historyService.createSession(
                `Session at ${new Date().toISOString()}`
            );
            this.currentSessionId = session.id;
            this.logger.log(`✓ Session initialized: ${session.id}`);
        } catch (error) {
            this.logger.error('Failed to initialize session', error);
            throw error;
        }
    }

    async chat(userInput: string): Promise<string> {
        if (!this.currentSessionId) await this.initSession();
        
        const relevantSkills = this.skillLoader.getRelevantSkills(userInput);
        await this.historyService.saveMessage(this.currentSessionId, { role: 'user', content: userInput });

        let currentStep = 0;
        
        while (currentStep < this.MAX_STEPS) {
            currentStep++;
            const history = await this.historyService.getContext(this.currentSessionId, 8);
            const messages = [
                this.buildLoopSystemPrompt(userInput, relevantSkills),
                ...history.reverse().map(m => ({
                    role: m.role,
                    content: m.role === 'assistant' ? this.formatAssistantContent(m) : m.content
                }))
            ];

            const llmRawResponse = await this.callLLM(messages);
            const parsed = this.safeParseJSON(llmRawResponse);
            if (!parsed) return "AI trả về định dạng không hợp lệ.";

            const { thought, tool, parameters } = parsed;
            this.logger.log(`Step ${currentStep} | 🧠: ${thought}`);

            // Xử lý thoát sớm
            if (tool === 'done') return parameters.summary || "Hoàn thành.";
            if (tool === 'ask_human') return `Agent cần hỗ trợ: ${parameters.message}`;

            // Thực thi hành động
            let result = "";
            let displayCommand = "";

            if (tool === 'file_operation') {
                displayCommand = `File: ${parameters.action} ${parameters.path}`;
                result = await this.handleFileOperation(parameters);
            } else {
                displayCommand = parameters.command || this.mapToolToCommand(tool, parameters);
                const exec = await this.terminal.execute(displayCommand, parameters.timeout_ms || 30000);
                result = exec.stdout || exec.stderr || exec.message;
            }

            // Lưu bước đi vào history
            await this.saveStep(tool, thought, displayCommand, result);
        }
        return "Đã đạt giới hạn xử lý tối đa.";
    }

    private mapToolToCommand(tool: string, parameters: any): string {
        switch (tool) {
            case 'read_structure':
                // Sử dụng find hoặc ls tùy vào logic bạn muốn
                const depth = parameters.max_depth || 2;
                return `find . -maxdepth ${depth} -not -path '*/.*'`;

            case 'search_grep':
                const pattern = parameters.query || '';
                const path = parameters.path || '.';
                return `grep -rnw "${path}" -e "${pattern}"`;

            case 'web_search':
                // Kết hợp với Brave API key từ env
                const query = encodeURIComponent(parameters.query || '');
                return `curl -s -H "X-Subscription-Token: ${env.get('brave_search_api_key')}" "https://api.search.brave.com/res/v1/web/search?q=${query}"`;

            default:
                // Nếu AI đã cung cấp sẵn trường command thì dùng luôn
                if (parameters.command) return parameters.command;

                throw new Error(`Tool ${tool} không biết cách chuyển đổi thành lệnh terminal.`);
        }
    }

    private safeParseJSON(text: string) {
        try {
            const clean = text.replace(/```json|```/g, '').trim();
            return JSON.parse(clean);
        } catch (e) {
            this.logger.error("JSON Parse Error", text);
            return null;
        }
    }

    private async handleFileOperation(params: any): Promise<string> {
        const { action, path, content } = params;
        
        // Chống lỗi khi content có ký tự đặc biệt bằng cách dùng file tạm hoặc kĩ thuật heredoc
        switch (action) {
            case 'read': return (await this.terminal.execute(`cat "${path}"`)).stdout;
            case 'list': return (await this.terminal.execute(`ls -F "${path}"`)).stdout;
            case 'mkdir': return (await this.terminal.execute(`mkdir -p "${path}"`)).message;
            case 'delete': return (await this.terminal.execute(`rm -rf "${path}"`)).message;
            case 'write':
                // Sử dụng kĩ thuật base64 để ghi file an toàn tuyệt đối, không sợ vướng ký tự đặc biệt
                const base64Content = Buffer.from(content).toString('base64');
                return (await this.terminal.execute(`echo "${base64Content}" | base64 -d > "${path}"`)).message;
            default: return "Action không hợp lệ";
        }
    }

    private async saveStep(tool: string, thought: string, command: string, result: string) {
        await this.historyService.saveMessage(this.currentSessionId, {
            role: 'assistant',
            content: `[${tool.toUpperCase()}] Thought: ${thought}`,
            command: command,
            output: result,
        });
    }

    /**
     * Gọi LLM API
     */
    private async callLLM(messages: any[]): Promise<string> {
        try {
            const response = await axios.post(
                `http://${env.get("llm_server.host_ip")}:${env.get("llm_server.host_port")}/v1/chat/completions`,
                {
                    messages,
                    temperature: 0.1,
                    max_tokens: 500,
                    response_format: Gemma4e4bConfig.structureResponse,
                },
                { timeout: 600000 }
            );

            return response.data?.choices?.[0]?.message?.content || '';
        } catch (error: any) {
            this.logger.error('LLM API call failed', error);
            throw new BadRequestException(
                `LLM connection error: ${error.message}`
            );
        }
    }

    /**
     * Format nội dung phản hồi của Assistant từ history
     */
    private formatAssistantContent(message: any): string {
        const parts: string[] = [];

        if (message.command) {
            parts.push(`Lệnh: ${message.command}`);
        }

        if (message.output) {
            const output = typeof message.output === 'string'
                ? message.output
                : JSON.stringify(message.output);
            const truncated = output.length > 200
                ? output.substring(0, 200) + '...'
                : output;
            parts.push(`Kết quả: ${truncated}`);
        }

        return parts.length > 0 ? parts.join('\n') : message.content;
    }

    /**
     * Lấy danh sách lệnh được phép
     */
    getAllowedCommands(): string[] {
        return this.terminal.getAllowedCommands();
    }

    /**
     * Reset phiên hiện tại
     */
    resetSession(): void {
        this.currentSessionId = '';
        this.logger.log('📝 Session reset');
    }

    private buildLoopSystemPrompt(originalGoal: string, loadedSkills: string) {
        const capabilities = this.skillLoader.getCapabilitiesSummary();

        return {
            role: 'system',
            content: `
                # ROLE: Senior Coding Agent (Local LLM, Native VM)

                ## MISSION
                - Thực hiện đúng mục tiêu người dùng với chất lượng production.
                - Tối ưu cho 3 chuyên môn chính: coding, file CRUD, technical research.
                - Tránh lặp hành động; ưu tiên giải pháp có thể kiểm chứng được.

                KỸ NĂNG BẠN CÓ:
                ${capabilities}

                # TÀI LIỆU KỸ THUẬT CHI TIẾT (LOADED SKILLS)
                Dưới đây là hướng dẫn chi tiết cho các công cụ đã được "nạp" vào bộ nhớ:
                ${loadedSkills}

                ## Sử dụng kĩ năng
                1. Nếu mục tiêu yêu cầu một công cụ trong REGISTRY nhưng chưa có trong LOADED SKILLS, 
               hãy thực hiện bước đầu tiên là khám phá hệ thống để tôi tự động nạp thêm context cho bạn.
                2. Bạn có quyền tự quyết định thứ tự sử dụng công cụ.

                Mục tiêu hiện tại: "${originalGoal}"

                 ## EXECUTION POLICY
                1. **Ưu tiên ý định user (cao nhất)**: Mọi hành động phải bám trực tiếp vào yêu cầu mới nhất của user.
                2. **Thứ tự ưu tiên khi xung đột**:
                    - (a) Yêu cầu user hiện tại
                    - (b) Ràng buộc an toàn/bảo mật bắt buộc
                    - (c) Các guideline tối ưu (coding standards, self-correction)
                3. Không mở rộng scope ngoài yêu cầu user nếu user chưa yêu cầu rõ.
                4. Discover đúng phạm vi bằng \`read_structure\` hoặc \`search_grep\` trước khi sửa.
                5. Chọn đúng tool theo chuyên môn, không trộn mục đích.
                6. Sau thay đổi code, ưu tiên chạy kiểm chứng tối thiểu (build/test/lint nếu khả thi).
                7. Nếu thất bại lặp lại, đổi chiến thuật; chỉ \`ask_human\` khi thật sự cần.
                8. Chỉ dùng \`done\` khi mục tiêu đã hoàn tất hoặc user xác nhận dừng.
                9. Có thể linh hoạt sử dụng tool hoặc không cần dùng tool dựa trên yêu cầu của user (có thể chỉ trả lời mà không cần dùng tool).

                ## USER-INTENT LOCK (BẮT BUỘC)
                - Trước mỗi quyết định, tự kiểm tra: "Hành động này có phục vụ trực tiếp mục tiêu user không?"
                - Nếu câu trả lời là "không rõ", phải \`ask_human\` để làm rõ thay vì tự suy diễn.
                - Không được ưu tiên làm "đẹp kiến trúc" hay "tối ưu thêm" nếu user chưa yêu cầu.
                - Khi có nhiều việc, luôn làm mục quan trọng nhất theo yêu cầu user trước.
                
                QUY TRÌNH SUY LUẬN:
                1. Nếu bạn cần thông tin, hãy đưa ra lệnh terminal để lấy thông tin (ls, cat, grep...).
                2. Nếu đã có thông tin, hãy thực hiện hành động tiếp theo.
                3. Nếu ĐÃ HOÀN THÀNH mục tiêu, hãy trả về duy nhất từ khóa: DONE
                4. Nếu cần sự giúp đỡ của con người hoặc bị kẹt, hãy trả về: ASK_HUMAN <lý do>
            `
        };
    }
}