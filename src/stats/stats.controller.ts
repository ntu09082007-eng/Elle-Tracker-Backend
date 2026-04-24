import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // Tính toán TTL
  private calculateTTL(): number {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Làm tròn lên mốc 10 phút tiếp theo
    const nextMilestone = Math.ceil((minutes + 1) / 10) * 10;
    const minutesUntilNext = nextMilestone - minutes;
    let ttlSeconds = minutesUntilNext * 60 - seconds;

    // [AN TOÀN] Nếu còn dưới 10s là đến giờ G, giữ cache tối thiểu 10s
    // để tránh việc TTL = 0 hoặc âm nếu server lag
    if (ttlSeconds < 10) {
      ttlSeconds = 10;
    }

    return ttlSeconds;
  }

  @Get('by-category')
  async getVoteStatsByCategory(
    @Query('categoryId') categoryId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.statsService.getVoteStatsByCategory(categoryId);
    const ttlSeconds = this.calculateTTL();

    res.setHeader(
      'Cache-Control',
      `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=15`,
    );

    return { status: 'success', data };
  }

  @Get('time-to-catch-up')
  async timeToCatchUp(
    @Query('candidateId') candidateId: string,
    @Query('timeRange') timeRange: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.statsService.timeToCatchUp(
      Number(candidateId),
      Number(timeRange),
    );
    const ttlSeconds = this.calculateTTL();

    res.setHeader(
      'Cache-Control',
      `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=15`,
    );

    return { status: 'success', data };
  }
}
