// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AgentService } from './service/agent.service';
import * as readline from 'readline';

async function bootstrap() {
  // Sử dụng createApplicationContext để không khởi chạy Web Server (giảm tải)
  const app = await NestFactory.createApplicationContext(AppModule);
  const agent = app.get(AgentService);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🤖 Agent Ready > ',
  });

  console.log('--- Terminal AI Agent OS Loaded ---');
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (input.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      process.exit(0);
    }

    if (input) {
      await agent.chat(input);
    }
    rl.prompt();
  }).on('close', () => {
    process.exit(0);
  });
}
bootstrap();