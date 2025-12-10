import { Controller, Get } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('integration/jobnimbus')
export class IntegrationController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * Health check for JobNimbus API connectivity
   * GET /api/v1/integration/jobnimbus/health
   */
  @Get('health')
  async healthCheck() {
    const health = await this.syncService.checkJobNimbusHealth();
    return {
      ...health,
      timestamp: new Date().toISOString(),
      service: 'JobNimbus',
    };
  }
}
