import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { CommandCenterService } from './command-center.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  CommandCenterOverviewDTO,
  CommandCenterJobAttentionDTO,
} from '@greenenergy/shared-types';

/**
 * CommandCenterController exposes internal APIs for the command center dashboard
 * All endpoints are protected by InternalApiKeyGuard
 */
@Controller('command-center')
@UseGuards(InternalApiKeyGuard)
export class CommandCenterController {
  private readonly logger = new Logger(CommandCenterController.name);

  constructor(private readonly commandCenterService: CommandCenterService) {}

  /**
   * GET /api/v1/command-center/overview
   * Get complete command center overview with summary, role views, and jobs needing attention
   */
  @Get('overview')
  async getOverview(): Promise<CommandCenterOverviewDTO> {
    this.logger.log('Command center overview requested');
    return this.commandCenterService.getOverview();
  }

  /**
   * GET /api/v1/command-center/jobs-needing-attention
   * Get list of jobs that need immediate attention
   */
  @Get('jobs-needing-attention')
  async getJobsNeedingAttention(): Promise<CommandCenterJobAttentionDTO[]> {
    this.logger.log('Jobs needing attention requested');
    return this.commandCenterService.getJobsNeedingAttention();
  }
}
