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
  // Biến này để trả dữ liệu "nóng" cho Frontend
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

  // Controller sẽ gọi hàm này
  getCachedData() {
    return this.cachedData;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async getVotes() {
    // 🛠 KIỂM TRA BIẾN MÔI TRƯỜNG TRÊN RENDER
    if (this.configService.get('ENABLE_CRON') !== 'true') {
      this.logger.warn('⚠️ ENABLE_CRON đang tắt. Web sẽ không có số liệu mới!');
      return;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'accept': '*/*',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'cookie': this.configService.get<string>('API_COOKIE') ?? '',
            'rsc': '1',
          },
        }),
      );

      const html = String(response.data);
      // Regex thần thánh để móc ID và Vote từ mã HTML của ELLE
      const combinedRegex = /[\\"]+id[\\"]+:[\\"]+([a-f0-9]+)[\\"]+,.*?[\\"]+voteCount[\\"]+:(\d+)/g;

      const apiResults = new Map<string, number>();
      let match;
      let foundCount = 0;

      while ((match = combinedRegex.exec(html)) !== null) {
        apiResults.set(match[1], parseInt(match[2]));
        foundCount++;
      }

      if (foundCount === 0) {
        this.logger.warn('⚠️ Không tìm thấy số vote. Có thể Cookie hết hạn hoặc cấu trúc web thay đổi.');
        this.cachedData.status = 'Blocked/Empty';
        return;
      }

      // Lấy danh sách ứng viên từ DB kèm Category để hiển thị tên hạng mục
      const allCandidates = await this.candidateRepository.find({
        relations: ['category']
      });

      const updatedList: any[] = [];

      for (const candidate of allCandidates) {
        const liveVotes = apiResults.get(String(candidate.id)) ?? 0;

        if (liveVotes > 0) {
          // 1. Cập nhật tổng số vote vào DB Candidate
          candidate.totalVotes = liveVotes;
          await this.candidateRepository.save(candidate);

          // 2. Lưu lịch sử (Snapshot) để sau này vẽ biểu đồ
          await this.snapshotRepository.save({
            candidateId: candidate.id,
            categoryId: candidate.categoryId,
            totalVotes: liveVotes,
            recordedAt: new Date(),
          });
        }

        // Đưa vào mảng tạm để cập nhật Cache
        updatedList.push({
          id: candidate.id,
          name: candidate.name,
          totalVotes: candidate.totalVotes,
          categoryId: candidate.categoryId,
          categoryName: candidate.category?.name || 'ELLE Beauty'
        });
      }

      // 🛠 ĐỔ HÀNG VÀO KHO: Frontend sẽ lấy dữ liệu từ đây
      this.cachedData = {
        updatedAt: new Date().toISOString(),
        data: updatedList,
        status: 'Success'
      };

      this.logger.log(`✅ Tuyệt vời! Đã cập nhật vote cho ${foundCount} người.`);

    } catch (error: any) {
      this.logger.error(`❌ Lỗi cào dữ liệu: ${error.message}`);
      this.cachedData.status = 'Error';
    }
  }
}
