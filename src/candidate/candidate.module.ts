import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { Candidate } from './candidate.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../category/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate, Category])],
  controllers: [CandidateController],
  providers: [CandidateService],
})
export class CandidateModule {}
