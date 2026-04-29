// src/modules/agent/terminal.service.ts
import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class TerminalService {
    async execute(command: string): Promise<string> {
        try {
            // Bảo mật cơ bản: Bạn có thể thêm whitelist lệnh ở đây
            const { stdout, stderr } = await execPromise(command);
            return stdout || stderr;
        } catch (error: any) {
            return `Error: ${error.message}`;
        }
    }
}