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
    // 1. Kiểm tra biến môi trường
    if (this.configService.get('ENABLE_CRON') !== 'true') {
        return;
    }
    
    this.logger.log('🚀 Đang cào dữ liệu thực tế từ ELLE...');

    try {
      // 2. Gọi API lấy HTML của ELLE
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

      // 3. Dùng Regex bóc tách dữ liệu (Xử lý cả dấu gạch chéo thoát chuỗi)
      const regex = /\\"id\\":\\"([a-f0-9]+)\\",\\"kind\\":\\"celebrity\\",\\"name\\":\\"([^\\"]+)\\",.*?\\"voteCount\\":(\d+)/g;
      const apiResults = new Map<string, number>();
      let match;

      while ((match = regex.exec(html)) !== null) {
        apiResults.set(match[1], parseInt(match[3]));
      }

      // 4. Lấy danh sách Candidate từ DB
      const allCandidates = await this.candidateRepository.find({
        relations: ['category'],
      });

      // 5. Khớp dữ liệu (Đã sửa lỗi TypeScript bằng cách ép kiểu String)
      const transformedData = allCandidates.map((candidate) => {
        // Ép kiểu ID về string để so khớp với dữ liệu ELLE
        const candIdStr = String(candidate.id);
        const liveVotes = apiResults.get(candIdStr) || 0;
        
        return {
          id: candidate.id,
          name: candidate.name,
          categoryId: candidate.categoryId,
          categoryName: candidate.category?.name || 'ELLE',
          totalVotes: liveVotes,
        };
      });

      this.cachedData = {
        updatedAt: new Date().toISOString(),
        data: transformedData,
        status: 'Success',
      };

      this.logger.log(`✅ Đã khớp dữ liệu cho ${transformedData.length} nhân vật.`);
      return this.cachedData;

    } catch (error: any) {
      this.logger.error('❌ Lỗi cào dữ liệu:', error.message);
      this.cachedData.status = 'Error';
    }
  }
}
