// src/modules/agent/terminal.service.ts
import { Injectable, Logger } from '@nestjs/common';
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
  // Danh sách các lệnh/từ khóa bị coi là nguy hiểm cần chặn hoàn toàn hoặc yêu cầu sudo cụ thể
  private readonly restrictedKeywords = [
    'sudo',       // Chặn sudo trực tiếp để tránh chiếm quyền root
    'ufw',        // Firewall
    'iptables',   // Network rules
    'mkfs',       // Format ổ đĩa
    'dd',         // Ghi đè block (nguy hiểm cho ổ cứng)
    'reboot', 
    'shutdown'
  ];

  /**
   * Thực thi lệnh terminal với xác thực và error handling
   * @param command Lệnh cần thực thi
   * @param timeout Thời gian chờ tối đa (ms)
   * @returns Kết quả thực thi có cấu trúc
   */
  async execute(
    command: string,
    timeout: number = 60000,
  ): Promise<TerminalExecutionResult> {
    const startTime = Date.now();
    const { stdout: cwd } = await execPromise('pwd');

    if (!command || typeof command !== 'string') {
      return this.createErrorResult(command, 'Lệnh rỗng', 400, startTime);
    }

    const trimmedCommand = command.trim();

    // KIỂM TRA QUYỀN (Thay thế whitelist)
    const permissionCheck = this.checkCommandPermission(trimmedCommand);
    if (!permissionCheck.allowed) {
      this.logger.warn(`Permission Denied: ${trimmedCommand}`);
      return this.createErrorResult(trimmedCommand, permissionCheck.reason, 403, startTime);
    }

    // Validate timeout (giữ nguyên)
    if (timeout < 1000 || timeout > 600000) timeout = 60000;

    try {
      this.logger.debug(`Executing: ${trimmedCommand}`);
      const { stdout, stderr } = await this.executeWithTimeout(trimmedCommand, timeout);
      const duration = Date.now() - startTime;

      return {
        success: true,
        command: trimmedCommand,
        stdout: `[CWD]: ${cwd.trim()}\n${stdout}`,
        stderr: stderr,
        exitCode: 0,
        duration,
        message: `Thành công (${duration}ms)`,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      let currentPath = 'unknown';
      try {
        const { stdout } = await execPromise('pwd');
        currentPath = stdout.trim();
      } catch {
        /* ignore */
      }

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
        // CẢI TIẾN: Kết hợp message lỗi vào stderr để Agent đọc được
        stderr: `[ERROR_TYPE]: ${message}\n[DETAILS]: ${error.stderr || error.message || 'Unknown error'}`,
        exitCode,
        duration,
        // CẢI TIẾN: Luôn trả về CWD kể cả khi lỗi
        message: `[CWD]: ${currentPath} | Lệnh thất bại sau ${duration}ms`,
      };

      this.logger.error(
        `Command failed: ${trimmedCommand} - ${message}`,
        error,
      );
      return result;
    }
  }

  private checkCommandPermission(command: string): { allowed: boolean; reason: string } {
    const lowerCommand = command.toLowerCase();

    // 1. Kiểm tra các từ khóa bị cấm tuyệt đối (Blacklist)
    for (const keyword of this.restrictedKeywords) {
      if (lowerCommand.includes(keyword)) {
        return { 
            allowed: false, 
            reason: `Lệnh chứa từ khóa nhạy cảm '${keyword}'. Bạn không có quyền thực thi lệnh hệ thống cấp cao.` 
        };
      }
    }

    // 2. Kiểm tra các lệnh phá hoại mạnh (ví dụ rm -rf /)
    if (lowerCommand.includes('rm') && lowerCommand.includes('-rf') && (lowerCommand.includes(' /') || lowerCommand.includes(' *'))) {
        return {
            allowed: false,
            reason: "Cảnh báo: Hành động xóa diện rộng bị từ chối để bảo vệ hệ thống."
        };
    }

    // Mọi lệnh khác được coi là được phép (Free movement)
    return { allowed: true, reason: '' };
  }

  /**
   * Thực thi lệnh với timeout
   */
  private executeWithTimeout(
    command: string,
    timeout: number,
  ): Promise<{ stdout: string; stderr: string }> {
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

}
