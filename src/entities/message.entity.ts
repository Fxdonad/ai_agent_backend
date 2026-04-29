// src/modules/history/entities/message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Session } from './session.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'enum', enum: ['system', 'user', 'assistant'] })
    role: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'text', nullable: true })
    command: string;

    @Column({ type: 'text', nullable: true })
    output: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => Session, (session) => session.messages)
    session: Session;
}