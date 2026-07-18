import { Model, Document } from 'mongoose';
import type { QueryFilter, UpdateQuery, QueryOptions, ClientSession } from 'mongoose';
import { IBaseRepository, FilterQuery, PaginationOptions, PaginatedResult } from '../../common/interfaces/base-repository.interface';

export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async create(doc: Partial<T>, session?: ClientSession): Promise<T> {
    const created = new this.model(doc);
    return await created.save({ session }) as T;
  }

  async findById(
    id: string,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.model.findById(id, projection, options).exec();
  }

  async findOne(
    filter: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.model.findOne(filter as QueryFilter<T>, projection, options).exec();
  }

  async find(
    filter: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.model.find(filter as QueryFilter<T>, projection, options).exec();
  }

  async findPaginated(
    filter: FilterQuery<T>,
    options: PaginationOptions,
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sort, populate } = options;
    const skip = (page - 1) * limit;

    let query = this.model.find(filter as QueryFilter<T>);

    if (sort) {
      query = query.sort(sort as any);
    }

    if (populate) {
      query = query.populate(populate as any);
    }

    const [data, total] = await Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.model.countDocuments(filter as QueryFilter<T>).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options: QueryOptions & { session?: ClientSession } = { returnDocument: 'after' },
  ): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, options).exec();
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions & { session?: ClientSession } = { returnDocument: 'after' },
  ): Promise<T | null> {
    return this.model.findOneAndUpdate(filter as QueryFilter<T>, update, options).exec();
  }

  async deleteById(id: string, session?: ClientSession): Promise<boolean> {
    const res = await this.model.findByIdAndDelete(id, { session }).exec();
    return res !== null;
  }

  async deleteOne(filter: FilterQuery<T>, session?: ClientSession): Promise<boolean> {
    const res = await this.model.findOneAndDelete(filter as QueryFilter<T>, { session }).exec();
    return res !== null;
  }

  async count(filter: FilterQuery<T>): Promise<number> {
    return this.model.countDocuments(filter as QueryFilter<T>).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const res = await this.model.exists(filter as QueryFilter<T>).exec();
    return res !== null;
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }
}
