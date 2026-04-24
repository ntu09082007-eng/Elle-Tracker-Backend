import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Candidate } from '../candidate/candidate.entity';
import { Snapshot } from '../snapshot/snapshot.entity';
import { Category } from '../category/category.entity';
import { Logger } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

// Làm tròn thời gian đến phút
function roundToMinute(date: Date): string {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d.toISOString();
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepository: Repository<Candidate>,
    @InjectRepository(Snapshot)
    private readonly snapshotRepository: Repository<Snapshot>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getVoteStatsByCategory(categoryId: string): Promise<any> {
    const cacheKey = `vote-stats:${categoryId}`;

    // Kiểm tra cache trước
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Cache miss for ${cacheKey}, querying database`);

    const categories = await this.categoryRepository.findBy({ id: categoryId });
    if (categories.length === 0) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }
    const snapshots = await this.snapshotRepository
      .createQueryBuilder('snapshots')
      .select('snapshots.recorded_at', 'recordedAt')
      .addSelect('snapshots.candidate_id', 'candidateId')
      .addSelect('snapshots.total_votes', 'totalVotes')
      .where('snapshots.category_id = :categoryId', { categoryId })
      .orderBy('"recordedAt"', 'DESC')
      .getRawMany();

    // Lấy thông tin candidate
    const candidateIds = [...new Set(snapshots.map((s) => s.candidateId))];
    const candidates = await this.candidateRepository.findBy({
      id: In(candidateIds),
    });
    const candidateMap = Object.fromEntries(
      candidates.map((c) => [c.id, c.name]),
    );

    // Kiểu dữ liệu cho từng ứng viên
    interface CandidateSnapshot {
      name: string;
      totalVotes: number;
      votesDiff?: number;
      growthRate?: number;
    }

    // Gom theo mốc thời gian
    const groupedByTime: Record<string, CandidateSnapshot[]> = {};

    for (const s of snapshots) {
      const roundedAt = roundToMinute(new Date(s.recordedAt));
      if (!groupedByTime[roundedAt]) groupedByTime[roundedAt] = [];

      groupedByTime[roundedAt].push({
        name: candidateMap[s.candidateId] || 'Unknown',
        totalVotes: Number(s.totalVotes),
      });
    }

    const formatted = Object.entries(groupedByTime).map(
      ([recordedAt, candidates]) => ({
        recordedAt,
        candidates: candidates.sort((a, b) => b.totalVotes - a.totalVotes),
      }),
    );

    // Sắp xếp theo thời gian giảm dần (mới nhất trước)
    formatted.sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );

    // Tính toán số phiếu tăng thêm và tốc độ tăng trưởng so với bản ghi trước đó
    for (let i = 0; i < formatted.length; i++) {
      const currentRecord = formatted[i];
      const previousRecord = formatted[i + 1]; // Bản ghi trước đó (cũ hơn)

      if (previousRecord) {
        // Tính khoảng thời gian giữa 2 bản ghi (phút)
        const timeDiffMs =
          new Date(currentRecord.recordedAt).getTime() -
          new Date(previousRecord.recordedAt).getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        currentRecord.candidates.forEach((candidate) => {
          const previousCandidate = previousRecord.candidates.find(
            (c) => c.name === candidate.name,
          );
          if (previousCandidate) {
            const votesDiff =
              candidate.totalVotes - previousCandidate.totalVotes;
            candidate.votesDiff = votesDiff;

            // Tính tốc độ tăng trưởng (phiếu/phút)
            candidate.growthRate =
              Math.round((votesDiff / timeDiffMinutes) * 100) / 100;
          } else {
            candidate.votesDiff = 0;
            candidate.growthRate = 0;
          }
        });
      } else {
        // Bản ghi đầu tiên (cũ nhất) không có votesDiff và growthRate
        currentRecord.candidates.forEach((candidate) => {
          candidate.votesDiff = 0;
          candidate.growthRate = 0;
        });
      }
    }

    const result = {
      categoryName: categories[0].name,
      data: formatted,
    };

    // Lưu vào cache
    await this.cacheManager.set(cacheKey, result);

    return result;
  }

  // Dự đoán thời gian để ứng viên bắt kịp ứng viên dẫn đầu của mỗi hạng mục
  // timeRange: tính theo phút
  async timeToCatchUp(canId: number, timeRange: number): Promise<any> {
    if (timeRange < 10)
      throw new BadRequestException('timeRange must be at least 10 minutes');

    const cacheKey = `time-to-catch-up:${canId}:${timeRange}`;

    // Kiểm tra cache trước
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.log(`Cache miss for ${cacheKey}, calculating prediction`);

    const candidate = await this.candidateRepository.findOne({
      where: { id: canId },
      relations: ['category'],
    });
    if (!candidate) {
      throw new NotFoundException(`Candidate with ID ${canId} not found`);
    }
    const categoryId = candidate.categoryId;

    const snapshots = await this.snapshotRepository
      .createQueryBuilder('snapshots')
      .where('snapshots.category_id = :categoryId', { categoryId })
      .orderBy('snapshots.recorded_at', 'DESC')
      .getMany();

    // Nhóm theo thời gian
    const groupedByTime: Record<string, Snapshot[]> = {};
    for (const s of snapshots) {
      const roundedAt = roundToMinute(s.recordedAt);
      if (!groupedByTime[roundedAt]) groupedByTime[roundedAt] = [];
      groupedByTime[roundedAt].push(s);
    }

    // Lấy danh sách ứng viên để gắn tên
    const candidateIds = [...new Set(snapshots.map((s) => s.candidateId))];
    const candidates = await this.candidateRepository.findBy({
      id: In(candidateIds),
    });
    const candidateMap = Object.fromEntries(
      candidates.map((c) => [c.id, c.name]),
    );

    // Sort theo thời gian giảm dần (mới nhất trước)
    const times = Object.keys(groupedByTime).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
    const voteSeries = times.map((t) => ({
      recordedAt: t,
      candidates: groupedByTime[t],
    }));

    // Lấy snapshot mới nhất và snapshot trước đó
    if (voteSeries.length < 2) {
      return { message: 'Not enough data' };
    }

    const previous = Math.ceil(timeRange / 10);
    const latestSnapshot = voteSeries[0]; // Index 0 là mới nhất
    const previousSnapshot =
      voteSeries[Math.min(previous, voteSeries.length - 1)];
    if (!latestSnapshot || !previousSnapshot) {
      return { message: 'Not enough data' };
    }

    // Tìm ứng viên có số vote dẫn đầu
    const leader = latestSnapshot.candidates.reduce((prev, current) =>
      Number(prev.totalVote) > Number(current.totalVote) ? prev : current,
    );

    // Tìm ứng viên muốn theo dõi (canId)
    const candi = latestSnapshot.candidates.find(
      (c) => c.candidateId === canId,
    );
    if (!candi) {
      throw new NotFoundException(
        `Candidate with ID ${canId} not found in latest snapshot`,
      );
    }
    // Lấy thời gian giữa hai lần chụp
    const latestTime = new Date(latestSnapshot.recordedAt).getTime();
    const previousTime = new Date(previousSnapshot.recordedAt).getTime();
    const timeDiff = (latestTime - previousTime) / (1000 * 60);

    const previousRunnerUp = previousSnapshot.candidates.find(
      (c) => c.candidateId === candi.candidateId,
    );

    const candiRate =
      (Number(candi.totalVote) -
        (previousRunnerUp ? Number(previousRunnerUp.totalVote) : 0)) /
      timeDiff;

    // Trường hợp ứng viên đã là người dẫn đầu
    if (leader.candidateId === candi.candidateId) {
      const result = {
        tracking: candidateMap[candi.candidateId],
        trackingCat: await this.categoryRepository.findOne({
          select: ['id', 'name'],
          where: { id: categoryId },
        }),
        trackingVote: Number(candi.totalVote),
        trackingRate: Math.round(candiRate * 100) / 100,
        isLeader: true,
        message: `${candidateMap[candi.candidateId]} is the leader!`,
      };

      // Lưu vào cache
      await this.cacheManager.set(cacheKey, result);

      return result;
    }

    // Lấy dữ liệu ứng viên từ snapshot trước
    const previousLeader = previousSnapshot.candidates.find(
      (c) => c.candidateId === leader.candidateId,
    );

    // Tính tốc độ tăng giữa 2 lần lấy snapshot
    const leaderRate =
      (Number(leader.totalVote) -
        (previousLeader ? Number(previousLeader.totalVote) : 0)) /
      timeDiff;
    const rateDiff = candiRate - leaderRate;
    const voteDiff = Number(leader.totalVote) - Number(candi.totalVote);

    // Trường hợp không thể bắt kịp
    if (rateDiff <= 0) {
      const result = {
        tracking: candidateMap[candi.candidateId],
        trackingCat: await this.categoryRepository.findOne({
          select: ['id', 'name'],
          where: { id: categoryId },
        }),
        trackingVote: Number(candi.totalVote),
        trackingRate: Math.round(candiRate * 100) / 100,
        isLeader: false,
        leader: candidateMap[leader.candidateId],
        leaderVote: Number(leader.totalVote),
        leaderRate: Math.round(leaderRate * 100) / 100,
        rateDiff: Math.round(rateDiff * 100) / 100,
        canCatchUp: false,
        message: `${candidateMap[candi.candidateId]} cannot catch up with the leader at the current rate`,
      };

      // Lưu vào cache
      await this.cacheManager.set(cacheKey, result);

      return result;
    }

    // Tính toán thời gian cần thiết
    const etaMinutes = voteDiff / rateDiff;
    const etaTime = new Date(latestTime + etaMinutes * 60000);
    const result = {
      tracking: candidateMap[candi.candidateId],
      trackingCat: await this.categoryRepository.findOne({
        select: ['id', 'name'],
        where: { id: categoryId },
      }),
      trackingVote: Number(candi.totalVote),
      trackingRate: Math.round(candiRate * 100) / 100,
      leader: candidateMap[leader.candidateId],
      leaderVote: Number(leader.totalVote),
      leaderRate: Math.round(leaderRate * 100) / 100,
      rateDiff: Math.round(rateDiff * 100) / 100,
      canCatchUp: true,
      etaMinutes: Math.round(etaMinutes * 10) / 10,
      etaTime: etaTime.toISOString(),
    };

    // Lưu vào cache
    await this.cacheManager.set(cacheKey, result);

    return result;
  }
}
