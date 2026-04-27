import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';
import { Snapshot } from '../snapshot/snapshot.entity'; // Đổi tên cho khớp Module

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger('Realtime');
  private readonly apiUrl: string;
  private cachedData: any = { updatedAt: new Date().toISOString(), data: [], status: 'Fetching' };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Candidate) private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(Snapshot) private readonly snapshotRepository: Repository<Snapshot>,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') ?? '';
  }

  // HÀM NÀY PHẢI CÓ ĐỂ CONTROLLER HẾT BÁO LỖI ĐỎ!
  getCachedData() {
    return this.cachedData;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotes() {
    if (this.configService.get('ENABLE_CRON') !== 'true') return;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': this.configService.get<string>('API_REFERER') ?? '',
            'Cookie': this.configService.get<string>('API_COOKIE') ?? '',
          },
        }),
      );
      const html = response.data;

      const combinedRegex = /\\"id\\":\\"([a-f0-9]+)\\",.*?\\"voteCount\\":(\d+)/g;
      const apiResults = new Map<string, number>();
      let match;

      while ((match = combinedRegex.exec(html)) !== null) {
        apiResults.set(match[1], parseInt(match[2]));
      }

      const allCandidates = await this.candidateRepository.find();

      const updatePromises = allCandidates.map(async (candidate) => {
        const candIdStr = String(candidate.id);
        const liveVotes = apiResults.get(candIdStr) ?? 0;

        if (liveVotes > 0) {
          // 1. Cập nhật số tổng
          candidate.totalVotes = liveVotes;
          await this.candidateRepository.save(candidate);

          // 2. Lưu lịch sử vào bảng Snapshots
          await this.snapshotRepository.save({
            candidateId: candidate.id,
            categoryId: candidate.categoryId,
            totalVotes: liveVotes,
            recordedAt: new Date(),
          });
        }
        return { id: candidate.id, name: candidate.name, totalVotes: liveVotes };
      });

      const transformedData = await Promise.all(updatePromises);
      this.cachedData = { updatedAt: new Date().toISOString(), data: transformedData, status: 'Success' };

      this.logger.log(`✅ Đã đồng bộ Vote và Snapshot cho ${allCandidates.length} nhân vật.`);

    } catch (error: any) {
      this.logger.error('❌ Lỗi Realtime:', error.message);
    }
  }
}
