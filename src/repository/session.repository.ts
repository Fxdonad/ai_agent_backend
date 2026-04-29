// src/modules/history/repositories/session.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from 'src/entities/session.entity';
import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
    constructor(private dataSource: DataSource) {
        super(dataSource.getRepository(Session));
    }

    createSession(title: string) {
        const session = this.repo.create({ title });
        return this.repo.save(session);
    }
}