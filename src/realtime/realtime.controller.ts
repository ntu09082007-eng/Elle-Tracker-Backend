import { Controller, Get } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@Controller('realtime') // <--- CHỈ ĐỂ DUY NHẤT CHỮ 'realtime'
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get() 
  async getLiveVotes() {
    // Gọi đúng tên hàm lấy dữ liệu trong service của bà
    return this.realtimeService.getRealtimeData(); 
  }
}
