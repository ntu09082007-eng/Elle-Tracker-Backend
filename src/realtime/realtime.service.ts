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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
            'Referer': 'https://events.elle.vn/elle-beauty-awards-2026/nhan-vat',
            'Cookie': this.configService.get<string>('API_COOKIE') ?? '',
            // MẬT LỆNH QUAN TRỌNG ĐỂ ELLE NHẢ DỮ LIỆU BÀ THẤY TRONG HÌNH
            'RSC': '1', 
            'Next-Router-State-Tree': '%5B%5B%22%22%2C%7B%22children%22%3A%5B%22elle-beauty-awards-2026%22%2C%7B%22children%22%3A%5B%22nhan-vat%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D%5D',
          },
        }),
      );
      
      const html = String(response.data); // Lấy data thô, KHÔNG dùng JSON.stringify nữa bà nhé!

      // Regex quét đúng cụm ID và voteCount bà thấy ở Response
      const combinedRegex = /[\\"]+id[\\"]+:[\\"]+([a-f0-9]+)[\\"]+,.*?[\\"]+voteCount[\\"]+:(\d+)/g;
      const apiResults = new Map<string, number>();
      let match;
      let countFound = 0;

      while ((match = combinedRegex.exec(html)) !== null) {
        apiResults.set(match[1], parseInt(match[2]));
        countFound++;
      }

      this.logger.log(`🔍 Quét được ${countFound} người từ API của ELLE.`);

      const allCandidates = await this.candidateRepository.find();
      const updatePromises = allCandidates.map(async (candidate) => {
        const liveVotes = apiResults.get(String(candidate.id)) ?? 0;

        // Cập nhật Database
        candidate.totalVotes = liveVotes;
        await this.candidateRepository.save(candidate);

        // Lưu Snapshot
        await this.snapshotRepository.save({
          candidateId: candidate.id,
          categoryId: candidate.categoryId,
          totalVotes: liveVotes,
          recordedAt: new Date(),
        });
        
        return { name: candidate.name, votes: liveVotes };
      });

      const transformedData = await Promise.all(updatePromises);
      this.cachedData = { updatedAt: new Date().toISOString(), data: transformedData, status: 'Success' };
      
      if (transformedData.length > 0) {
        this.logger.log(`Mẫu thực tế: ${transformedData[0].name} -> ${transformedData[0].votes} votes`);
      }

    } catch (error: any) {
      this.logger.error('❌ Lỗi:', error.message);
    }
  }
}
