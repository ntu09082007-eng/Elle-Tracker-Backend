import { Controller, Get, Header } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=4')
  async getVotes() {
    // 🛠 Dùng getCachedData() vì trong Service của bà tên nó là thế!
    return await this.realtimeService.getCachedData(); 
  }
}
