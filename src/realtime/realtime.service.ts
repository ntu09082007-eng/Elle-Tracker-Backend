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
            'accept': '*/*',
            'accept-language': 'vi,en-US;q=0.9,en;q=0.8',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'referer': 'https://events.elle.vn/elle-beauty-awards-2026/nhan-vat',
            'cookie': this.configService.get<string>('API_COOKIE') ?? '',
            'rsc': '1', // Mật lệnh để ELLE nhả dữ liệu thô
          },
        }),
      );
      
      const html = String(response.data);

      // Regex quét đúng cụm ID và voteCount bà thấy ở Response
      const combinedRegex = /[\\"]+id[\\"]+:[\\"]+([a-f0-9]+)[\\"]+,.*?[\\"]+voteCount[\\"]+:(\d+)/g;
      const apiResults = new Map<string, number>();
      let match;
      let foundCount = 0;

      while ((match = combinedRegex.exec(html)) !== null) {
        apiResults.set(match[1], parseInt(match[2]));
        foundCount++;
      }

      if (foundCount === 0) {
        this.logger.warn('⚠️ Chú ý: Không tìm thấy số vote nào. Kiểm tra lại Cookie!');
        return; // Thoát ra, không ghi số 0 vào DB
      }

      const allCandidates = await this.candidateRepository.find();
      const updatePromises = allCandidates.map(async (candidate) => {
        const liveVotes = apiResults.get(String(candidate.id)) ?? 0;

        // CHỈ LƯU KHI SỐ VOTE LỚN HƠN 0
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
      this.logger.log(`✅ Thành công! Đã hốt được vote cho ${foundCount} người.`);

    } catch (error: any) {
      this.logger.error(`❌ ELLE chặn rồi bà ơi (Lỗi ${error.response?.status}): Lấy lại Cookie ngay!`);
    }
  }
}
