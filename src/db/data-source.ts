// src/database/data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";
import { Message } from "../entities/message.entity";
import { Session } from "../entities/session.entity";
import env from "../environment"

export const AppDataSource = new DataSource({
    type: "mysql",
    host: env.get("database.host"),
    port: env.get("database.port"),
    username: env.get("database.username"),
    password: env.get("database.password"),
    database: env.get("database.database"),

    entities: ['src/**/entities/*.entity{.ts,.js}'],
    synchronize: false,
    migrations: ['src/**/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    migrationsRun: false,
});