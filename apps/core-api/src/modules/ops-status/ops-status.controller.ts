import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpsStatusService } from './ops-status.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { OpsStatusDTO } from '@greenenergy/shared-types';

/**
 * Controller that exposes platform operations status endpoint.
 * Protected with InternalApiKeyGuard to restrict access to internal tools.
 */
@Controller('ops')
@UseGuards(InternalApiKeyGuard)
export class OpsStatusController {
  constructor(private readonly opsStatusService: OpsStatusService) {}

  @Get('status')
  async getStatus(): Promise<OpsStatusDTO> {
    return this.opsStatusService.getOpsStatus();
  }
}
