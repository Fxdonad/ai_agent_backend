import { MigrationInterface, QueryRunner } from "typeorm";

export class InitDb1777456045295 implements MigrationInterface {
    name = 'InitDb1777456045295'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`messages\` (\`id\` varchar(36) NOT NULL, \`role\` enum ('system', 'user', 'assistant') NOT NULL, \`content\` text NOT NULL, \`command\` text NULL, \`output\` text NULL, \`metadata\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`sessionId\` varchar(36) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sessions\` (\`id\` varchar(36) NOT NULL, \`title\` varchar(255) NULL, \`status\` varchar(255) NOT NULL DEFAULT 'active', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD CONSTRAINT \`FK_066163c46cda7e8187f96bc87a0\` FOREIGN KEY (\`sessionId\`) REFERENCES \`sessions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP FOREIGN KEY \`FK_066163c46cda7e8187f96bc87a0\``);
        await queryRunner.query(`DROP TABLE \`sessions\``);
        await queryRunner.query(`DROP TABLE \`messages\``);
    }

}
