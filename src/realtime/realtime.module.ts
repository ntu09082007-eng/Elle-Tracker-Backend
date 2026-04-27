import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { Category } from '../category/category.entity';
import { Candidate } from '../candidate/candidate.entity';
import { Snapshot } from '../snapshot/snapshot.entity'; // Dùng đúng tên Snapshot của bà

@Module({
  imports: [
    // Đưa cả 3 thực thể này vào để Service dùng được
    TypeOrmModule.forFeature([Snapshot, Category, Candidate]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [RealtimeController],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
