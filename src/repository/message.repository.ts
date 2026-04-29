// src/modules/history/repositories/message.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { Session } from 'src/entities/session.entity';
import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';

@Injectable()
export class MessageRepository extends BaseRepository<Message> {
    constructor(private dataSource: DataSource) {
        super(dataSource.getRepository(Message));
    }

    saveMessage(sessionId: string, data: Partial<Message>) {
        const message = this.repo.create({
            ...data,
            session: { id: sessionId } as Session,
        });
        return this.repo.save(message);
    }

    getContext(sessionId: string, limit = 5) {
        return this.repo.find({
            where: { session: { id: sessionId } },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}