import { Controller, Get } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get()
  async getVotes() {
    // Đổi thành getCachedData cho khớp với Service của bà!
    return this.realtimeService.getCachedData();
  }
}
