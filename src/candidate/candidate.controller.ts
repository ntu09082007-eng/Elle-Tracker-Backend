import { Controller } from '@nestjs/common';
import { Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { Candidate } from './candidate.entity';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get()
  async findAll(): Promise<Candidate[]> {
    return this.candidateService.findAll();
  }

  @Get('one/:id')
  async findOne(@Param('id') id: number): Promise<Candidate> {
    return this.candidateService.findOne(id);
  }
  /*
  @Get('category/:categoryId')
  async findByCategory(
    @Param('categoryId') categoryId: number,
  ): Promise<Candidate[]> {
    return this.candidateService.findByCategory(categoryId);
  }*/

  @Post()
  async create(
    @Body() createCandidateDto: CreateCandidateDto,
  ): Promise<Candidate> {
    return this.candidateService.create(createCandidateDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() updateCandidateDto: UpdateCandidateDto,
  ): Promise<Candidate> {
    return this.candidateService.update(id, updateCandidateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.candidateService.remove(id);
  }
}
