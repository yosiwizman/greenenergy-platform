import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ExecutiveReportService } from './executive-report.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { ExecutiveDigestDTO } from '@greenenergy/shared-types';

@Controller('exec-report')
@UseGuards(InternalApiKeyGuard)
export class ExecutiveReportController {
  constructor(private readonly executiveReportService: ExecutiveReportService) {}

  /**
   * Preview the weekly digest without sending
   */
  @Get('weekly')
  async getWeeklyDigestPreview(): Promise<ExecutiveDigestDTO> {
    return this.executiveReportService.buildWeeklyDigest();
  }

  /**
   * Manually trigger sending the weekly digest
   */
  @Post('weekly/send')
  async sendWeeklyDigest(@Body() body?: { recipientsOverride?: string[] }): Promise<{ ok: true }> {
    await this.executiveReportService.sendWeeklyDigest(new Date(), {
      recipientsOverride: body?.recipientsOverride,
    });
    return { ok: true };
  }
}
