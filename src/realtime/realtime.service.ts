import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';
import { Snapshot } from '../snapshot/snapshot.entity';

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

  getCachedData() { return this.cachedData; }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotes() {
    if (this.configService.get('ENABLE_CRON') !== 'true') return;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'accept': 'text/x-component',
            'accept-language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            'referer': 'https://events.elle.vn/elle-beauty-awards-2026/nhan-vat',
            'cookie': this.configService.get<string>('API_COOKIE') ?? '',
            'rsc': '1', // Mật lệnh quan trọng nhất
            'next-router-state-tree': '%5B%5B%22%22%2C%7B%22children%22%3A%5B%22elle-beauty-awards-2026%22%2C%7B%22children%22%3A%5B%22nhan-vat%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%5D',
          },
        }),
      );
      
      const html = String(response.data);
      const combinedRegex = /[\\"]+id[\\"]+:[\\"]+([a-f0-9]+)[\\"]+,.*?[\\"]+voteCount[\\"]+:(\d+)/g;
      
      const apiResults = new Map<string, number>();
      let match;
      let foundCount = 0;

      while ((match = combinedRegex.exec(html)) !== null) {
        apiResults.set(match[1], parseInt(match[2]));
        foundCount++;
      }

      // NẾU KHÔNG THẤY SỐ THÌ KHÔNG GHI ĐÈ SỐ 0
      if (foundCount === 0) {
        this.logger.warn('⚠️ ELLE đang giấu số rồi bà nội ơi. Đừng ghi số 0 vào DB nhé!');
        return;
      }

      const allCandidates = await this.candidateRepository.find();
      const updatePromises = allCandidates.map(async (candidate) => {
        const liveVotes = apiResults.get(String(candidate.id)) ?? 0;

        if (liveVotes > 0) {
          candidate.totalVotes = liveVotes;
          await this.candidateRepository.save(candidate);

          await this.snapshotRepository.save({
            candidateId: candidate.id,
            categoryId: candidate.categoryId,
            totalVotes: liveVotes,
            recordedAt: new Date(),
          });
        }
      });

      await Promise.all(updatePromises);
      this.logger.log(`✅ NGON! Đã cập nhật vote cho ${foundCount} người.`);

    } catch (error: any) {
      this.logger.error(`❌ ELLE chặn rồi (Lỗi ${error.response?.status || 'Mạng'}). Lấy lại Cookie đi bà!`);
    }
  }
}
