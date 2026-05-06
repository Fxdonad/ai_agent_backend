// src/service/discord.service.ts
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { InjectRepository } from '@nestjs/typeorm'; // Import này
import { Repository } from 'typeorm';             // Import này
import { Message as MessageEntity } from '../entities/message.entity'; // Thực thể của bạn
import env from "../environment";
import { MessageRepository } from 'src/repository';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;

  constructor(
    private readonly messageRepo: MessageRepository,
  ) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Bắt buộc để đọc nội dung tin nhắn
      ],
    });
  }

  async onModuleInit() {
    await this.setupBot();
  }

  private async setupBot() {
    const token = env.get('discord.token');
    this.client.once(Events.ClientReady, (c) => {
        this.logger.log(`Ready! Logged in as ${c.user.tag}`);
      });

    this.client.on(Events.MessageCreate, async (message) => {
      // 1. Bỏ qua tin nhắn của bot để tránh vòng lặp vô tận
      if (message.author.bot) return;

      this.logger.log(`Nhận tin nhắn từ ${message.author.username}: ${message.content}`);

      // 2. Lưu tin nhắn vào Database (MySQL)
      try {
        const newMessage = this.messageRepo.create({
          // Giả sử entity Message của bạn có các trường này
          // content: message.content,
          // author: message.author.username,
          // discordId: message.id,
          // createdAt: new Date()
        });
        // await this.messageRepo.save(newMessage); 
      } catch (dbError) {
        this.logger.error('Lỗi lưu DB:', dbError);
      }

      // 3. Xử lý lệnh hoặc tích hợp logic Chat (Ví dụ: AI hoặc Rep theo từ khóa)
      if (message.content.toLowerCase().includes('hello bot')) {
        await message.reply(`Chào ${message.author.username}, mình là Bot từ NestJS!`);
      }
    });

    await this.client.login(token);
  }
}