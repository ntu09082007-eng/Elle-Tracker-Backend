import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SnapshotModule } from '../snapshot/snapshot.module';

import { Category } from '../category/category.entity';
import { Candidate } from '../candidate/candidate.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Snapshot, Category, Candidate]),
    HttpModule,
    ConfigModule,
    SnapshotModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}

