// src/modules/history/history.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Session } from 'src/entities/session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class HistoryService {
    constructor(
        @InjectRepository(Session) private sessionRepo: Repository<Session>,
        @InjectRepository(Message) private messageRepo: Repository<Message>,
    ) { }

    async createSession(title: string) {
        const session = this.sessionRepo.create({ title });
        return this.sessionRepo.save(session);
    }

    async saveMessage(sessionId: string, data: Partial<Message>) {
        const message = this.messageRepo.create({
            ...data,
            session: { id: sessionId } as Session,
        });
        return this.messageRepo.save(message);
    }

    async getContext(sessionId: string, limit = 5) {
        return this.messageRepo.find({
            where: { session: { id: sessionId } },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}