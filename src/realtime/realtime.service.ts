// ... giữ nguyên các phần import ở trên

@Injectable()
export class RealtimeService {
  // ... (giữ nguyên constructor và các biến khai báo)

  @Cron(CronExpression.EVERY_10_SECONDS)
  async getVotes() {
    if (this.configService.get('ENABLE_CRON') !== 'true') return;
    
    this.logger.log('🚀 Đang cào dữ liệu và CẬP NHẬT vào Database...');

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Referer': this.configService.get<string>('API_REFERER') ?? '',
            'Cookie': this.configService.get<string>('API_COOKIE') ?? '',
          },
        }),
      );
      const html = response.data;

      // SỬA REGEX: Bóc riêng từng thằng để tránh lỗi ELLE đổi thứ tự dữ liệu
      const idRegex = /\\"id\\":\\"([a-f0-9]+)\\"/g;
      const voteRegex = /\\"voteCount\\":(\d+)/g;
      
      const ids: string[] = [];
      const votes: number[] = [];
      let match;

      while ((match = idRegex.exec(html)) !== null) ids.push(match[1]);
      while ((match = voteRegex.exec(html)) !== null) votes.push(parseInt(match[1]));

      const apiResults = new Map<string, number>();
      ids.forEach((id, index) => {
        apiResults.set(id, votes[index] || 0);
      });

      const allCandidates = await this.candidateRepository.find();

      // BƯỚC QUAN TRỌNG: Vừa map vừa lưu vào DB
      const updatePromises = allCandidates.map(async (candidate) => {
        const liveVotes = apiResults.get(String(candidate.id)) || 0;
        
        // CHỈNH SỬA: Cập nhật trực tiếp vào Database
        if (candidate.total_votes !== liveVotes) {
            candidate.total_votes = liveVotes;
            await this.candidateRepository.save(candidate); // Lệnh này mới là "Ghi" nè bà!
        }

        return {
          id: candidate.id,
          name: candidate.name,
          totalVotes: liveVotes,
        };
      });

      const transformedData = await Promise.all(updatePromises);

      this.cachedData = {
        updatedAt: new Date().toISOString(),
        data: transformedData,
        status: 'Success',
      };

      this.logger.log(`✅ Đã cập nhật số vote thực tế cho ${transformedData.length} nhân vật.`);
      
      // LOG KIỂM TRA: Bà nhìn vào log xem số này có > 0 không
      this.logger.debug(`Mẫu dữ liệu: ${transformedData[0]?.name} - ${transformedData[0]?.totalVotes} votes`);

    } catch (error: any) {
      this.logger.error('❌ Lỗi cào dữ liệu:', error.message);
      this.cachedData.status = 'Error';
    }
  }
}
