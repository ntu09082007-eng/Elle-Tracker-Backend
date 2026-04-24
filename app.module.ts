import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { CandidateModule } from './candidate/candidate.module';
import { CategoryModule } from './category/category.module';
import { SnapshotModule } from './snapshot/snapshot.module';
import { StatsModule } from './stats/stats.module';
import { RealtimeModule } from './realtime/realtime.module';

import typeormConfig from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [typeormConfig],
    }),

    // Cache module với TTL 10 phút (600 giây) - sync với cron job
    CacheModule.register({
      isGlobal: true,
      ttl: 600000, // 10 minutes in milliseconds
      max: 100, // maximum number of items in cache
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.get<TypeOrmModuleOptions>('typeorm')!,
    }),

    CandidateModule,
    CategoryModule,
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 5000 }),
    SnapshotModule,
    StatsModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
