// src/modules/agent/agent.service.ts
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import env from '../environment';
import { TerminalService } from './terminal.service';
import { SkillLoaderService } from './skill-loader.service';
import { HistoryService } from 'src/service/history.service';

@Injectable()
export class AgentService {
    private currentSessionId: string;
    constructor(
        private terminal: TerminalService,
        private skillLoader: SkillLoaderService,
        private historyService: HistoryService,
    ) { }

    async initSession() {
        const session = await this.historyService.createSession(`Session at ${new Date().toISOString()}`);
        this.currentSessionId = session.id;
    }

    async chat(userInput: string) {
        if (!this.currentSessionId) await this.initSession();

        // 1. Lưu câu hỏi mới của User vào DB trước
        const userMessage = await this.historyService.saveMessage(this.currentSessionId, {
            role: 'user',
            content: userInput,
        });

        // 2. Lấy 2 lượt hội thoại gần nhất (không tính câu vừa lưu)
        // Mỗi "lượt" gồm 1 User và 1 Assistant -> Lấy 4 messages gần nhất
        const previousContext = await this.historyService.getContext(this.currentSessionId, 4);

        // Đảo ngược lại vì getContext thường trả về DESC (mới nhất lên đầu)
        const sortedContext = previousContext.reverse();

        // 3. Chuẩn bị System Prompt và Skills
        const relevantSkills = this.skillLoader.getRelevantSkills(userInput);
        const systemMessage = {
            role: 'system',
            content: `
            You are a Terminal AI Agent.
            USER: ${env.get('user_name')}
            ROOT_DIR: ${env.get('agent_work_dir')}
            AVAILABLE SKILLS: ${relevantSkills}
            STRICT RULES: ONLY output raw terminal command. No markdown.
        `
        };

        // 4. Build mảng messages cuối cùng
        const finalMessages = [
            systemMessage,
            ...sortedContext.map(m => ({
                role: m.role,
                content: m.role === 'assistant'
                    ? (m.command || m.content) // Ưu tiên lệnh đã thực thi
                    : m.content
            })),
            { role: 'user', content: userInput } // Tin nhắn hiện tại
        ];

        try {
            const response = await axios.post(`http://${env.get("llm_server.host_ip")}:${env.get("llm_server.host_port")}/v1/chat/completions`, {
                messages: finalMessages,
                temperature: 0,
            });

            const command = response.data.choices[0].message.content.trim().replace(/```bash|```/g, '');

            console.log(`> Executing: ${command}`);
            const result = await this.terminal.execute(command);

            // 5. Lưu lại phản hồi của Assistant để làm context cho lượt sau
            await this.historyService.saveMessage(this.currentSessionId, {
                role: 'assistant',
                content: "Executing command...",
                command: command,
                output: result
            });

            return result;
        } catch (error) {
            console.error('LLM Studio connection error.');
        }
    }
}