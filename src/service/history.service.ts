// src/modules/history/history.service.ts
import { Injectable } from '@nestjs/common';
import { MessageRepository, SessionRepository } from 'src/repository';

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