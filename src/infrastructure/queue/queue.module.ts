import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: configService.get<string>('redis.url')
          ? new Redis(configService.get<string>('redis.url')!, { family: 4, maxRetriesPerRequest: null })
          : {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
            password: configService.get<string>('redis.password') || undefined,
            db: configService.get<number>('redis.db'),
          },
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false, // Keep failed jobs for inspection/retry
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule { }
