import { Controller } from '@nestjs/common';
import { SnapshotService } from './snapshot.service';
import { Get, Param, Delete } from '@nestjs/common';

@Controller('cron')
export class CronController {
  constructor(private readonly snapshotService: SnapshotService) {}
  @Get('sync-votes')
  async manualSyncVotes(): Promise<string> {
    await this.snapshotService.syncVotes();
    return 'Vote synchronization initiated';
  }
}

@Controller('snapshot')
export class SnapshotController {
  constructor(private readonly snapshotService: SnapshotService) {}

  @Get()
  async findAll(): Promise<any[]> {
    return this.snapshotService.findAll();
  }

  @Get(':id')
  async findByCategory(@Param('id') id: number): Promise<any> {
    return this.snapshotService.findByCategory(id);
  }

  @Delete(':id')
  async deleteSnapshots(@Param('id') id: number): Promise<void> {
    return this.snapshotService.deleteSnapshots(id);
  }
}
