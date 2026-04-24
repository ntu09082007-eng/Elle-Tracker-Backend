import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Candidate } from '../candidate/candidate.entity';
import { Snapshot } from '../snapshot/snapshot.entity';
import { Category } from '../category/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate, Snapshot, Category])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}

