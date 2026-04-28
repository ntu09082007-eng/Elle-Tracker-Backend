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
  // Khởi tạo mảng rỗng
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

  // Frontend sẽ gọi hàm này để lấy data
  getCachedData() {
    return this.cachedData;
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async getVotes() {
    // 🛠 KIỂM TRA ENABLE_CRON: Bà nhớ set cái này là 'true' trong Environment của Render nhé!
    if (this.configService.get('ENABLE_CRON') !== 'true') {
        this.logger.warn('⚠️ ENABLE_CRON đang tắt, không cào dữ liệu đâu bà nội!');
        return;
    }
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'accept': '*/*',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            'cookie': this.configService.get<string>('API_COOKIE') ?? '',
            'rsc': '1',
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

      if (foundCount === 0) {
        this.logger.warn('⚠️ ELLE chặn rồi bà ơi. Kiểm tra lại Cookie!');
        this.cachedData.status = 'Blocked/Error';
        return;
      }

      const allCandidates = await this.candidateRepository.find({
          relations: ['category'] // Để lấy luôn tên hạng mục cho đẹp
      });
      
      const updatedList: any[] = [];

      for (const candidate of allCandidates) {
        const liveVotes = apiResults.get(String(candidate.id)) ?? 0;
        if (liveVotes > 0) {
          candidate.totalVotes = liveVotes;
          // Cập nhật DB
          await this.candidateRepository.save(candidate);
          
          // Lưu snapshot
          await this.snapshotRepository.save({
            candidateId: candidate.id,
            categoryId: candidate.categoryId,
            totalVotes: liveVotes,
            recordedAt: new Date(),
          });
        }
        
        // Đẩy vào mảng để tí nữa cập nhật Cache
        updatedList.push({
            id: candidate.id,
            name: candidate.name,
            totalVotes: candidate.totalVotes,
            categoryId: candidate.categoryId,
            categoryName: candidate.category?.name || 'Chưa phân loại'
        });
      }
      
      // 🛠 BƯỚC QUAN TRỌNG NHẤT: CẬP NHẬT BIẾN CACHEDDATA
      this.cachedData = {
          updatedAt: new Date().toISOString(),
          data: updatedList, // <--- ĐỔ HÀNG VÀO ĐÂY THÌ FRONTEND MỚI THẤY SỐ!!!
          status: 'Success'
      };

      this.logger.log(`✅ Tuyệt vời! Đã cập nhật vote cho ${foundCount} người và đẩy vào Cache.`);

    } catch (error: any) {
      this.logger.error(`❌ Lỗi cào dữ liệu: ${error.message}`);
      this.cachedData.status = 'Error';
    }
  }
}    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'accept': '*/*',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
            'cookie': this.configService.get<string>('API_COOKIE') ?? '',
            'rsc': '1',
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

      if (foundCount === 0) {
        this.logger.warn('⚠️ Vẫn không thấy số. ELLE có vẻ đang chặn IP hoặc Cookie hết hạn.');
        return;
      }

      const allCandidates = await this.candidateRepository.find();
      
      // Chạy vòng lặp để cập nhật từng người
      for (const candidate of allCandidates) {
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
      }
      
      this.logger.log(`✅ Tuyệt vời! Đã cập nhật vote cho ${foundCount} người.`);

    } catch (error: any) {
      this.logger.error(`❌ Lỗi rồi: ${error.message}`);
    }
  }
}
