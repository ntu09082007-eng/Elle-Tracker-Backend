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
  private cachedData: any = { updatedAt: new Date().toISOString(), data: [], status: 'Fetching' };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Candidate) private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(Snapshot) private readonly snapshotRepository: Repository<Snapshot>,
  ) {}

  getCachedData() { return this.cachedData; }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async getVotes() {
    if (this.configService.get('ENABLE_CRON') !== 'true') return;
    try {
      const response = await firstValueFrom(this.httpService.get(this.configService.get('API_URL'), {
        headers: { 'accept': '*/*', 'cookie': this.configService.get('API_COOKIE') || '', 'rsc': '1' }
      }));
      const html = String(response.data);
      const combinedRegex = /[\\"]+id[\\"]+:[\\"]+([a-f0-9]+)[\\"]+,.*?[\\"]+voteCount[\\"]+:(\d+)/g;
      const apiResults = new Map();
      let match;
      while ((match = combinedRegex.exec(html)) !== null) { apiResults.set(match[1], parseInt(match[2])); }

      const allCandidates = await this.candidateRepository.find({ relations: ['category'] });
      const updatedList = allCandidates.map(c => {
        const liveVotes = apiResults.get(String(c.id)) || 0;
        if (liveVotes > 0) {
            c.totalVotes = liveVotes;
            this.candidateRepository.save(c);
        }
        return { id: c.id, name: c.name, totalVotes: c.totalVotes, categoryName: c.category?.name || 'ELLE' };
      });

      this.cachedData = { updatedAt: new Date().toISOString(), data: updatedList, status: 'Success' };
      this.logger.log(`✅ Đã cập nhật ${updatedList.length} người.`);
    } catch (e: any) { this.logger.error(`❌ Lỗi: ${e.message}`); }
  }
}
