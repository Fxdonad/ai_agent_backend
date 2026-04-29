// src/modules/agent/agent.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import env from '../environment';
import { TerminalService, TerminalExecutionResult } from './terminal.service';
import { SkillLoaderService } from './skill-loader.service';
import { HistoryService } from 'src/service/history.service';

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

    /**
     * Xử lý chat từ người dùng
     * @param userInput Đầu vào từ người dùng
     * @returns Kết quả thực thi lệnh hoặc lỗi
     */
    async chat(userInput: string): Promise<string> {
        if (!this.currentSessionId) await this.initSession();

        const relevantSkills = this.skillLoader.getRelevantSkills(userInput);

        // Lưu yêu cầu ban đầu của User
        await this.historyService.saveMessage(this.currentSessionId, {
            role: 'user',
            content: userInput,
        });

        let currentStep = 0;
        let lastResult = "";
        let isComplete = false;

        this.logger.log(`🚀 Starting reasoning chain for: "${userInput}"`);

        while (currentStep < this.MAX_STEPS && !isComplete) {
            currentStep++;
            this.logger.debug(`Step ${currentStep}/${this.MAX_STEPS}...`);

            // 1. Lấy Context hội thoại (Bao gồm cả kết quả các bước trước trong vòng lặp này)
            const history = await this.historyService.getContext(this.currentSessionId, 6);
            const sortedContext = history.reverse();

            // 2. Cập nhật System Prompt với chỉ dẫn về "DONE" và "ASK_HUMAN"
            const systemMessage = this.buildLoopSystemPrompt(userInput, relevantSkills);

            const messages = [
                systemMessage,
                ...sortedContext.map(m => ({
                    role: m.role,
                    content: m.role === 'assistant' ? this.formatAssistantContent(m) : m.content
                })),
            ];

            // 3. Gọi LLM
            const llmResponse = await this.callLLM(messages);
            const rawContent = llmResponse.trim();

            // 4. Kiểm tra điều kiện dừng (Trigger)
            if (rawContent.includes('DONE')) {
                this.logger.log('🏁 Agent flagged task as COMPLETED.');
                isComplete = true;
                break;
            }

            if (rawContent.includes('ASK_HUMAN')) {
                this.logger.log('❓ Agent is waiting for human input.');
                this.logger.log("Agent ask: ", rawContent)
                isComplete = true; // Thoát vòng lặp để chờ user nhập tiếp từ Terminal
                return "Agent đang chờ phản hồi từ bạn...";
            }

            // 5. Nếu không phải trigger dừng, coi đó là một lệnh Terminal
            const command = this.sanitizeCommand(rawContent);
            this.logger.log(`🤖 [Step ${currentStep}] Executing: ${command}`);

            const executionResult = await this.terminal.execute(command, 30000);

            // 6. Lưu kết quả bước này vào History để bước sau LLM đọc được
            await this.historyService.saveMessage(this.currentSessionId, {
                role: 'assistant',
                content: `Step ${currentStep}: Executed ${command}`,
                command: command,
                output: executionResult.stdout || executionResult.stderr,
                metadata: { success: executionResult.success }
            });

            lastResult = executionResult.stdout || executionResult.stderr;
        }

        if (currentStep >= this.MAX_STEPS) {
            this.logger.warn('⚠️ Reached maximum reasoning steps.');
        }

        return lastResult || "Task initiated.";
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
     * Vệ sinh và trích xuất lệnh từ response của LLM
     */
    private sanitizeCommand(response: string): string {
        return response
            .trim()
            .replace(/```bash\n?/g, '')
            .replace(/```\n?/g, '')
            .replace(/`/g, '')
            .split('\n')[0] // Lấy dòng lệnh đầu tiên
            .trim();
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
     * Xây dựng nội dung phản hồi của Assistant
     */
    private buildAssistantMessage(
        command: string,
        result: TerminalExecutionResult
    ): { content: string; success: boolean } {
        let content = '';

        if (result.success) {
            content = `✓ Lệnh '${command}' thực thi thành công (${result.duration}ms)\n`;
            content += `📤 Output:\n${result.stdout || '(empty)'}`;
        } else {
            content = `✗ Lệnh '${command}' thất bại\n`;
            content += `❌ Lỗi (${result.exitCode}): ${result.message}\n`;
            if (result.stderr) {
                content += `📋 Chi tiết: ${result.stderr}`;
            }
        }

        return {
            content,
            success: result.success,
        };
    }

    /**
     * Xử lý các lỗi trong quá trình chat
     */
    private handleChatError(error: any): string {
        if (error instanceof BadRequestException) {
            return `⚠️ Lỗi xác thực: ${error.message}`;
        }

        if (error.code === 'ECONNREFUSED') {
            return `⚠️ Không thể kết nối đến LLM Server. Kiểm tra cấu hình.`;
        }

        if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            return `⚠️ Timeout hoặc lỗi mạng khi kết nối LLM Server.`;
        }

        return `⚠️ Lỗi không xác định: ${error.message || 'Unknown error'}`;
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

    private buildLoopSystemPrompt(originalGoal: string, skills: string) {
        return {
            role: 'system',
            content: `
                # ROLE: Senior Coding Agent (Local LLM, Native VM)

                ## MISSION
                - Thực hiện đúng mục tiêu người dùng với chất lượng production.
                - Tối ưu cho 3 chuyên môn chính: coding, file CRUD, technical research.
                - Tránh lặp hành động; ưu tiên giải pháp có thể kiểm chứng được.

                KỸ NĂNG BẠN CÓ:
                ${skills}

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