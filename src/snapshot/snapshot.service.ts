import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

import { Snapshot } from './snapshot.entity';
import { Candidate } from '../candidate/candidate.entity';
import { Category } from '../category/category.entity';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get<string>('API_URL') ?? '';
  }

  async findAll(): Promise<Snapshot[]> {
    return this.snapshotRepository.find({
      relations: ['candidate', 'category'],
      order: { recordedAt: 'DESC' },
    });
  }

  async findByCategory(categoryId: number): Promise<Snapshot[]> {
    return this.snapshotRepository.find({
      where: { id: categoryId },
      relations: ['candidate', 'category'],
      order: { recordedAt: 'DESC' },
    });
  }

  async deleteSnapshots(id: number): Promise<void> {
    await this.snapshotRepository.delete(id);
  }

  async syncVotes() {
    this.logger.log('Fetching votes from external API...');

    // Lấy danh sách tất cả các category
    const categories = await this.categoryRepository.find();

    if (!categories || categories.length === 0) {
      this.logger.warn('No categories found in database');
      return;
    }

    try {
      const headers = {
        Referer: this.configService.get<string>('API_REFERER') ?? '',
        Cookie: this.configService.get<string>('API_COOKIE') ?? '',
      };

      // Gọi API cho từng category
      for (const category of categories) {
        this.logger.log(
          `Fetching votes for category: ${category.name} (${category.id})`,
        );

        const apiUrlWithCategory = `${this.apiUrl}&lstId=${category.id}`;

        try {
          const response = await firstValueFrom(
            this.http.get(apiUrlWithCategory, {
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

          for (const item of result.Data) {
            const { m: candidateId, list } = item;
            if (!candidateId || !list || list.length === 0) continue;

            const totalVote = list[0].v; // Get vote count from the first item in list

            const candidate = await this.candidateRepository.findOne({
              where: { id: candidateId },
              relations: ['category'],
            });

            if (candidate) {
              const snapshot = this.snapshotRepository.create({
                candidate: candidate,
                category: candidate.category,
                totalVote: totalVote,
              });
              await this.snapshotRepository.save(snapshot);
              this.logger.log(
                `Created snapshot for candidate ${candidate.id} with ${totalVote} votes successfully`,
              );
            }
          }

          this.logger.log(
            `Completed fetching votes for category ${category.id}`,
          );
        } catch (categoryError) {
          this.logger.error(
            `Failed to fetch votes for category ${category.id}:`,
            categoryError,
          );
        }
      }

      // Cache sẽ tự động invalidate sau 10 phút (TTL)
      this.logger.log('Cache will be automatically invalidated by TTL');
    } catch (error) {
      this.logger.error('Failed to fetching votes:', error);
    }
  }

  // Lấy dữ liệu vote mới nhất mỗi 10 phút
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    const enableCron = this.configService.get<string>('ENABLE_CRON');
    if (enableCron !== 'true') {
      this.logger.warn('Cron job is disabled. Skipping syncVotes.');
      return;
    }
    await this.syncVotes();
    // Xoá cache sau khi đồng bộ dữ liệu mới
    await this.cacheManager.clear();
    this.logger.log('Cache cleared after syncing votes.');
  }
}
