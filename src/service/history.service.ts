// src/modules/history/history.service.ts
import { Injectable } from '@nestjs/common';
import { Message } from 'src/entities/message.entity';
import { Session } from 'src/entities/session.entity';
import { MessageRepository, SessionRepository } from 'src/repository';
import { Repository } from 'typeorm';

@Injectable()
export class HistoryService {
    constructor(
        private readonly sessionRepo: SessionRepository,
        private readonly messageRepo: MessageRepository,
    ) { }

    createSession(title: string) {
        return this.sessionRepo.createSession(title);
    }

    saveMessage(sessionId: string, data: any) {
        return this.messageRepo.saveMessage(sessionId, data);
    }

    getContext(sessionId: string, limit = 5) {
        return this.messageRepo.getContext(sessionId, limit);
    }
}