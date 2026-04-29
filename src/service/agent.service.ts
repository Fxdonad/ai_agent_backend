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
    async chat(userInput: string): Promise<TerminalExecutionResult | string> {
        if (!this.currentSessionId) {
            await this.initSession();
        }

        try {
            // ============ BƯỚC 1: Lưu câu hỏi của User ============
            this.logger.debug(`User input: ${userInput}`);
            await this.historyService.saveMessage(this.currentSessionId, {
                role: 'user',
                content: userInput,
            });

            // ============ BƯỚC 2: Lấy context hội thoại gần nhất ============
            // Mỗi "lượt" gồm 1 User + 1 Assistant -> Lấy 4 messages
            const previousContext = await this.historyService.getContext(this.currentSessionId, 4);
            const sortedContext = previousContext.reverse();

            // ============ BƯỚC 3: Chuẩn bị System Prompt ============
            const relevantSkills = this.skillLoader.getRelevantSkills(userInput);
            const systemMessage = {
                role: 'system',
                content: `
                    Bạn là một Terminal AI Agent thông minh.
                    Thông tin:
                    - Người dùng: ${env.get('user_name')}
                    - Thư mục làm việc: ${env.get('agent_work_dir')}
                    - Kỹ năng có sẵn: ${Array.isArray(relevantSkills) ? relevantSkills.join(', ') : relevantSkills}

                    Hướng dẫn:
                    - Phân tích yêu cầu của người dùng cẩn thận.
                    - Chỉ thực thi các lệnh an toàn và hợp lệ.
                    - Nếu lệnh bị từ chối (security policy), hãy giải thích và đề xuất lệnh thay thế.
                    - Cung cấp phản hồi rõ ràng về kết quả thực thi.
                `,
            };

            // ============ BƯỚC 4: Build mảng messages cuối cùng ============
            const finalMessages = [
                systemMessage,
                ...sortedContext.map(m => ({
                    role: m.role,
                    content: m.role === 'assistant'
                        ? this.formatAssistantContent(m)
                        : m.content
                })),
                { role: 'user', content: userInput }
            ];

            // ============ BƯỚC 5: Gọi LLM để lấy lệnh ============
            this.logger.debug('Calling LLM API...');
            const llmResponse = await this.callLLM(finalMessages);

            if (!llmResponse) {
                throw new BadRequestException('LLM returned empty response');
            }

            const command = this.sanitizeCommand(llmResponse);

            if (!command) {
                throw new BadRequestException('No valid command extracted from LLM response');
            }

            this.logger.log(`📋 LLM suggested: ${command}`);

            // ============ BƯỚC 6: Thực thi lệnh ============
            const executionResult = await this.terminal.execute(command, 30000);

            // ============ BƯỚC 7: Xử lý kết quả thực thi ============
            const assistantMessage = this.buildAssistantMessage(command, executionResult);

            await this.historyService.saveMessage(this.currentSessionId, {
                role: 'assistant',
                content: assistantMessage.content,
                command: command,
                output: executionResult.stdout || executionResult.stderr,
                metadata: {
                    success: executionResult.success,
                    exitCode: executionResult.exitCode,
                    duration: executionResult.duration,
                    message: executionResult.message,
                },
            });

            this.logger.log(
                `${executionResult.success ? '✓' : '✗'} Command executed in ${executionResult.duration}ms`
            );

            return executionResult;
        } catch (error: any) {
            this.logger.error('Chat error:', error);
            const errorMessage = this.handleChatError(error);

            // Lưu lỗi vào history để có context cho lần sau
            await this.historyService.saveMessage(this.currentSessionId, {
                role: 'assistant',
                content: errorMessage,
                metadata: {
                    success: false,
                    error: error.message,
                },
            });

            return errorMessage;
        }
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
}