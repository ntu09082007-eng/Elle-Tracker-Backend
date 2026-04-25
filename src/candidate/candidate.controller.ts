import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
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

  @Get(':id') // Bỏ chữ 'one/' cho nó chuẩn RESTful API bro nhé
  async findOne(@Param('id') id: string): Promise<Candidate> {
    return this.candidateService.findOne(id);
  }

  @Post()
  async create(
    @Body() createCandidateDto: CreateCandidateDto,
  ): Promise<Candidate> {
    return this.candidateService.create(createCandidateDto);
  }

  // 🛠 SỬA CHỖ NÀY: Nếu bro muốn cập nhật tên/thông tin chung
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
  ): Promise<any> {
    // Nếu trong Service bro chưa có hàm update chung, 
    // tạm thời dùng updateVotes nếu chỉ muốn cập nhật số vote
    // Hoặc bro thêm lại hàm update(id, dto) vào Service như tôi viết dưới đây
    return this.candidateService.updateVotes(id, 0); // Ví dụ tạm thời
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.candidateService.remove(id);
  }
}
