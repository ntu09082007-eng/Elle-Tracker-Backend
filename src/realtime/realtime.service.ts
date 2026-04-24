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

  private readonly cachedData: any = {
    updatedAt: new Date().toISOString(),
    data: [],
    status: 'Fetching',
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
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
    this.logger.log('Fetching new votes from external API...');
    // Lấy danh sách tất cả các category
    const categories = await this.categoryRepository.find();

    if (!categories || categories.length === 0) {
      this.logger.warn('No categories found in database');
      return { updatedAt: new Date().toISOString(), data: [] };
    }

    try {
      const headers = {
        Referer: this.configService.get<string>('API_REFERER') ?? '',
        Cookie: this.configService.get<string>('API_COOKIE') ?? '',
      };

      let allTransformedData: any[] = [];

      // Gọi API cho từng category
      for (const category of categories) {
        this.logger.log(
          `Fetching realtime votes for category: ${category.name} (${category.id})`,
        );

        const apiUrlWithCategory = `${this.apiUrl}&lstId=${category.id}`;

        try {
          const response = await firstValueFrom(
            this.httpService.get(apiUrlWithCategory, {
              headers,
              responseType: 'json',
            }),
          );
          const result = response.data;

          if (!result.Success || !result.Data) {
            this.logger.warn(
              `API returned unsuccessful response or no data for category ${category.id}`,
            );
            continue;
          }

          // Transform the API data to the desired format
          const transformedData = await Promise.all(
            result.Data.map(async (item) => {
              const candidateId = item.m;
              const totalVotes = item.list?.[0]?.v || 0;

              // Fetch candidate from database to get name and category
              const candidate = await this.candidateRepository.findOne({
                where: { id: candidateId },
                relations: ['category'],
              });

              if (!candidate) {
                return null;
              }

              return {
                id: candidate.id,
                name: candidate.name,
                categoryId: candidate.categoryId,
                categoryName: candidate.category?.name || '',
                totalVotes: totalVotes,
              };
            }),
          );

          // Filter out null values (candidates not found in DB)
          const filteredData = transformedData.filter((item) => item !== null);
          allTransformedData = [...allTransformedData, ...filteredData];
        } catch (categoryError) {
          this.logger.error(
            `Failed to fetch realtime votes for category ${category.id}:`,
            categoryError,
          );
        }
      }

      const payload = {
        updatedAt: new Date().toISOString(),
        data: allTransformedData,
      };

      this.cachedData.updatedAt = payload.updatedAt;
      this.cachedData.data = payload.data;
      this.cachedData.status = 'Success';
      this.logger.log(
        'Successfully updated cached votes data at ' + payload.updatedAt,
      );

      return payload;
    } catch (error) {
      this.logger.error('Error fetching votes from external API', error);
    }
  }
}
