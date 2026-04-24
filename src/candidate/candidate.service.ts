import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Candidate } from './candidate.entity';
import { Repository } from 'typeorm';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { Category } from '../category/category.entity';

@Injectable()
export class CandidateService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Candidate[]> {
    return this.candidateRepository.find();
  }

  async findOne(id: number): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOneBy({ id });
    if (!candidate) {
      throw new NotFoundException(`Candidate not found`);
    }
    return candidate;
  }

  async create(dto: CreateCandidateDto) {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const candidate = this.candidateRepository.create({
      id: dto.id,
      name: dto.name,
      category: category,
    });

    return this.candidateRepository.save(candidate);
  }

  async update(id: number, dto: UpdateCandidateDto): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOneBy({ id });
    if (!candidate) {
      throw new NotFoundException(`Candidate not found`);
    } 
    candidate.name = dto.name ?? candidate.name;
    return this.candidateRepository.save(candidate);
  }

  async remove(id: number): Promise<void> {
    const result = await this.candidateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Candidate not found`);
    }
  }
}
