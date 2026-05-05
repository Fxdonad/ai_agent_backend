import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeType1777993492638 implements MigrationInterface {
    name = 'ChangeType1777993492638'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`content\``);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`content\` longtext NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`messages\` DROP COLUMN \`content\``);
        await queryRunner.query(`ALTER TABLE \`messages\` ADD \`content\` text NOT NULL`);
    }

}
