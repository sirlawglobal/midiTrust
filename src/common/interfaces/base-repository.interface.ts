import type { ClientSession, QueryFilter, UpdateQuery, QueryOptions, Document } from 'mongoose';

export type FilterQuery<T> = QueryFilter<T>;

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: string | Record<string, 1 | -1>;
  populate?: string | string[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IBaseRepository<T extends Document> {
  create(doc: Partial<T>, session?: ClientSession): Promise<T>;
  findById(id: string, projection?: Record<string, unknown>, options?: QueryOptions): Promise<T | null>;
  findOne(filter: FilterQuery<T>, projection?: Record<string, unknown>, options?: QueryOptions): Promise<T | null>;
  find(filter: FilterQuery<T>, projection?: Record<string, unknown>, options?: QueryOptions): Promise<T[]>;
  findPaginated(filter: FilterQuery<T>, options: PaginationOptions): Promise<PaginatedResult<T>>;
  updateById(id: string, update: UpdateQuery<T>, options?: QueryOptions & { session?: ClientSession }): Promise<T | null>;
  updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions & { session?: ClientSession }): Promise<T | null>;
  deleteById(id: string, session?: ClientSession): Promise<boolean>;
  deleteOne(filter: FilterQuery<T>, session?: ClientSession): Promise<boolean>;
  count(filter: FilterQuery<T>): Promise<number>;
  exists(filter: FilterQuery<T>): Promise<boolean>;
  aggregate(pipeline: any[]): Promise<any[]>;
}
