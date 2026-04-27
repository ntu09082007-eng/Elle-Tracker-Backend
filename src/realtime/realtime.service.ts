import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private readonly apiUrl: string;

  private cachedData: any = {
    updatedAt: new Date().toISOString(),
    data: [],
    status: 'Fetching',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') ?? '';
  }

  getCachedData() {
    return this.cachedData;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotes() {
    if (this.configService.get('ENABLE_CRON') !== 'true') {
        return;
    }
    
    this.logger.log('🚀 Đang cào dữ liệu thực tế từ ELLE...');

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Referer': this.configService.get<string>('API_REFERER') ?? '',
            'Cookie': this.configService.get<string>('API_COOKIE') ?? '',
          },
        }),
      );
      const html = response.data;

      // Regex bóc tách ID và Vote (Dùng 2 regex để tránh lỗi ELLE đổi thứ tự)
      const idRegex = /\\"id\\":\\"([a-f0-9]+)\\"/g;
      const voteRegex = /\\"voteCount\\":(\d+)/g;
      
      const ids: string[] = [];
      const votes: number[] = [];
      let match;

      while ((match = idRegex.exec(html)) !== null) ids.push(match[1]);
      while ((match = voteRegex.exec(html)) !== null) votes.push(parseInt(match[1]));

      const apiResults = new Map<string, number>();
      ids.forEach((id, index) => {
        apiResults.set(id, votes[index] || 0);
      });

      // Lấy danh sách Candidate từ DB
      const allCandidates = await this.candidateRepository.find({
        relations: ['category'],
      });

      // Vừa khớp dữ liệu vừa cập nhật vào Database
      const updatePromises = allCandidates.map(async (candidate) => {
        const candIdStr = String(candidate.id);
        const liveVotes = apiResults.get(candIdStr) || 0;
        
        // Chỉ lưu vào DB nếu số vote thực tế lớn hơn 0
        if (liveVotes > 0) {
            candidate.total_votes = liveVotes;
            await this.candidateRepository.save(candidate);
        }

        return {
          id: candidate.id,
          name: candidate.name,
          categoryId: candidate.categoryId,
          categoryName: candidate.category?.name || 'ELLE',
          totalVotes: liveVotes,
        };
      });

      const transformedData = await Promise.all(updatePromises);

      this.cachedData = {
        updatedAt: new Date().toISOString(),
        data: transformedData,
        status: 'Success',
      };

      this.logger.log(`✅ Đã cập nhật số vote cho ${transformedData.length} nhân vật.`);
      return this.cachedData;

    } catch (error: any) {
      this.logger.error('❌ Lỗi cào dữ liệu:', error.message);
      this.cachedData.status = 'Error';
    }
  }
}
