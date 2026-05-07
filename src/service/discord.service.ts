// src/service/discord.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { 
  Client, GatewayIntentBits, Events, Message, Interaction, 
  REST, Routes, SlashCommandBuilder, TextChannel 
} from 'discord.js';
import env from "../environment";

@Injectable()
export class DiscordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscordService.name);
  public readonly client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  async onModuleInit() {
    this.initEvents();
    await this.client.login(env.get('discord.token'));
  }

  private initEvents() {
    this.client.once(Events.ClientReady, async (c) => {
      this.logger.log(`🚀 Bot đã sẵn sàng: ${c.user.tag}`);
      await this.registerSlashCommands();
    });

    this.client.on(Events.MessageCreate, (msg) => this.handleMessage(msg));
    this.client.on(Events.InteractionCreate, (int) => this.handleInteraction(int));
  }

  // --- Logic Xử lý tin nhắn (Passive) ---
  private async handleMessage(message: Message) {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!ping') {
      await message.reply('Pong! Backend vẫn đang phản hồi tốt.');
    }
  }

  // --- Logic Xử lý Lệnh Slash (Active) ---
  private async handleInteraction(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    // Kiểm tra quyền Admin (Ví dụ)
    if (!interaction.memberPermissions?.has('Administrator')) {
      return interaction.reply({ content: 'Bạn không có quyền thực hiện lệnh này!', ephemeral: true });
    }

    const { commandName, options } = interaction;

    switch (commandName) {
      case 'status':
        await interaction.reply({ 
          content: `✅ Uptime: ${Math.floor(process.uptime())}s`, 
          ephemeral: true 
        });
        break;

      case 'clear_cache':
        const type = options.getString('type');
        // Logic nghiệp vụ ở đây
        await interaction.reply(`🚀 Đã làm sạch bộ nhớ: ${type}`);
        break;
    }
  }

  // --- Đăng ký Lệnh ---
  private async registerSlashCommands() {
    if (!this.client.user) return;

    const commands = [
      new SlashCommandBuilder()
        .setName('status')
        .setDescription('Kiểm tra trạng thái backend'),
      new SlashCommandBuilder()
        .setName('clear_cache')
        .setDescription('Xóa cache hệ thống')
        .addStringOption(opt => opt.setName('type').setDescription('Chọn loại cache').setRequired(true)
          .addChoices({ name: 'Database', value: 'db' }, { name: 'Session', value: 'session' })),
    ];

    const rest = new REST({ version: '10' }).setToken(env.get('discord.token'));
    const serverId = env.get('discord.serverId')
    try {
      await rest.put(
        Routes.applicationGuildCommands(this.client.user.id, serverId),
        { body: commands.map(c => c.toJSON()) }
      );
      this.logger.log('✅ Đã đồng bộ Slash Commands!');
    } catch (error) {
      this.logger.error('❌ Lỗi đăng ký lệnh:', error);
    }
  }

  // --- Hàm hỗ trợ gửi tin nhắn từ Backend ---
  async notify(channelId: string, content: string) {
    const channel = await this.client.channels.fetch(channelId);
    if (channel instanceof TextChannel) {
      await channel.send(content);
    }
  }

  async onModuleDestroy() {
    this.client.destroy();
  }
}