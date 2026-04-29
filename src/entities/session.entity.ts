// src/modules/history/entities/session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Message } from './message.entity';

@Entity('sessions')
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    title: string;

    @Column({ default: 'active' })
    status: string;

    @CreateDateColumn()
    createdAt: Date;

    @OneToMany(() => Message, (message) => message.session, { cascade: true })
    messages: Message[];
}