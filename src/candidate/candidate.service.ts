import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Candidate } from './candidate.entity';
import { Repository } from 'typeorm';
import { Category } from '../category/category.entity';
import { CreateCandidateDto } from './dto/create-candidate.dto';

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

  // 🔥 LỆNH XUẤT SỐ VOTE: Ghi thẳng vào cột total_votes của candidate
  async updateVotes(id: string, votes: number): Promise<void> {
    await this.candidateRepository.update(id, { totalVotes: votes });
  }

  async findOne(id: string): Promise<Candidate> {
    const candidate = await this.candidateRepository.findOneBy({ id });
    if (!candidate) throw new NotFoundException(`Candidate not found`);
    return candidate;
  }

  async create(dto: CreateCandidateDto) {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const candidate = this.candidateRepository.create({
      id: dto.id,
      name: dto.name,
      category: category,
      totalVotes: 0
    });
    return this.candidateRepository.save(candidate);
  }

  async remove(id: string): Promise<void> {
    const result = await this.candidateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Candidate not found`);
  }
}
