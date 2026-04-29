// src/common/repositories/base.repository.ts
import { Repository, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';

export class BaseRepository<T> {
    constructor(protected readonly repo: Repository<T | any>) { }

    create(data: DeepPartial<T>): T {
        return this.repo.create(data);
    }

    save(data: DeepPartial<T>): Promise<T> {
        return this.repo.save(data);
    }

    findAll(options?: FindManyOptions<T>): Promise<T[]> {
        return this.repo.find(options);
    }

    findOne(options: FindOneOptions<T>): Promise<T | null> {
        return this.repo.findOne(options);
    }

    delete(criteria: any) {
        return this.repo.delete(criteria);
    }
}