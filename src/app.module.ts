import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import env from "./environment"
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { Message } from './entities/message.entity';

import * as Services from "./service"
import * as Repository from "./repository"

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: env.get('database.host'),
      port: env.get('database.port'),
      username: env.get('database.username'),
      password: env.get('database.password'),
      database: env.get('database.database'),
      entities: [Session, Message],
      synchronize: true,
      logging: false,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, ...Object.values(Repository), ...Object.values(Services), { provide: "ENV", useValue: env.getProperties() }],
})
export class AppModule { }
