import { Module } from '@nestjs/common';
import { SnapshotController } from './snapshot.controller';
import { SnapshotService } from './snapshot.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Snapshot } from './snapshot.entity';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Snapshot, Candidate, Category]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [SnapshotController],
  providers: [SnapshotService],
})
export class SnapshotModule {}

