// src/modules/agent/terminal.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Kết quả thực thi lệnh terminal
 */
export interface TerminalExecutionResult {
    success: boolean;
    command: string;
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    message: string;
}

/**
 * Cấu hình whitelist cho các lệnh an toàn
 */
interface WhitelistConfig {
    patterns: RegExp[];
    maxTimeout: number;
    allowedTools: string[];
}

@Injectable()
export class TerminalService {
    private readonly logger = new Logger(TerminalService.name);
    private readonly whitelistConfig: WhitelistConfig = {
        // Các pattern lệnh được phép thực thi
        patterns: [
            /^npm\s+(install|run|start|build|test|list)/i,
            /^npm\s+run\s+migration:(run|revert|generate)/i,
            /^npm\s+run\s+seed:run/i,
            /^node\s+(--version|-v)/i,
            /^git\s+(status|log|branch|diff|add|commit|push|pull|clone)/i,
            /^npx\s+[\w-]+/i,
            /^chmod\s+/i,
            /^mkdir\s+-p\s+/i,
            /^(echo|pwd|ls|cat|grep|find|base64|printf)\s+/i,
            /^rm\s+-rf\s+/i,
        ],
        maxTimeout: 600000, // 10 phút tối đa
        allowedTools: ['npm', 'node', 'git', 'npx', 'echo', 'pwd', 'ls', 'cat', 'grep', 'find', 'chmod', 'mkdir', 'base64', 'printf', 'rm'],
    };

    /**
     * Thực thi lệnh terminal với xác thực và error handling
     * @param command Lệnh cần thực thi
     * @param timeout Thời gian chờ tối đa (ms)
     * @returns Kết quả thực thi có cấu trúc
     */
    async execute(command: string, timeout: number = 30000): Promise<TerminalExecutionResult> {
        const startTime = Date.now();

        // Validate input
        if (!command || typeof command !== 'string') {
            return this.createErrorResult(command, 'Lệnh không hợp lệ hoặc rỗng', 400, startTime);
        }

        const trimmedCommand = command.trim();

        // Kiểm tra whitelist
        if (!this.isCommandWhitelisted(trimmedCommand)) {
            const message = `Lệnh '${trimmedCommand}' không được phép thực thi (security policy)`;
            this.logger.warn(`Blocked command: ${trimmedCommand}`);
            return this.createErrorResult(trimmedCommand, message, 403, startTime);
        }

        // Validate timeout
        if (timeout < 1000 || timeout > this.whitelistConfig.maxTimeout) {
            timeout = Math.min(timeout, this.whitelistConfig.maxTimeout);
        }

        try {
            this.logger.debug(`Executing command: ${trimmedCommand}`);

            const { stdout, stderr } = await this.executeWithTimeout(trimmedCommand, timeout);
            const duration = Date.now() - startTime;

            const result: TerminalExecutionResult = {
                success: true,
                command: trimmedCommand,
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0,
                duration,
                message: `Lệnh thực thi thành công sau ${duration}ms`,
            };

            this.logger.log(`Command succeeded: ${trimmedCommand} (${duration}ms)`);
            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Phân loại lỗi
            let message = 'Lỗi thực thi lệnh';
            let exitCode = 1;

            if (error.killed) {
                message = `Lệnh bị timeout sau ${timeout}ms`;
                exitCode = 124; // TIMEOUT exit code
            } else if (error.code === 'ENOENT') {
                message = `Lệnh không tồn tại: ${trimmedCommand.split(' ')[0]}`;
                exitCode = 127; // COMMAND NOT FOUND exit code
            } else if (error.code === 'EACCES') {
                message = `Quyền bị từ chối khi thực thi: ${trimmedCommand}`;
                exitCode = 126; // PERMISSION DENIED exit code
            } else if (error.code) {
                exitCode = error.code;
                message = `Lệnh thất bại với exit code ${error.code}`;
            }

            const result: TerminalExecutionResult = {
                success: false,
                command: trimmedCommand,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message || 'Unknown error',
                exitCode,
                duration,
                message,
            };

            this.logger.error(`Command failed: ${trimmedCommand} - ${message}`, error);
            return result;
        }
    }

    /**
     * Thực thi lệnh với timeout
     */
    private executeWithTimeout(command: string, timeout: number): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            const child = exec(command, { timeout }, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });

            // Handle timeout
            const timeoutHandle = setTimeout(() => {
                child.kill();
            }, timeout);

            child.on('exit', () => clearTimeout(timeoutHandle));
        });
    }

    /**
     * Kiểm tra xem lệnh có trong whitelist không
     */
    private isCommandWhitelisted(command: string): boolean {
        return this.whitelistConfig.patterns.some(pattern => pattern.test(command));
    }

    /**
     * Tạo kết quả lỗi
     */
    private createErrorResult(
        command: string,
        message: string,
        exitCode: number,
        startTime: number,
    ): TerminalExecutionResult {
        return {
            success: false,
            command,
            stdout: '',
            stderr: message,
            exitCode,
            duration: Date.now() - startTime,
            message,
        };
    }

    /**
     * Lấy danh sách các lệnh được whitelist
     */
    getAllowedCommands(): string[] {
        return this.whitelistConfig.allowedTools;
    }

    /**
     * Thêm pattern mới vào whitelist (chỉ cho admin)
     */
    addWhitelistPattern(pattern: RegExp): void {
        this.whitelistConfig.patterns.push(pattern);
        this.logger.log(`Added whitelist pattern: ${pattern.source}`);
    }
}