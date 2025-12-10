import { Controller, Get, Param } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import type { SchedulingRiskDTO } from '@greenenergy/shared-types';

@Controller('api/v1/scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  /**
   * GET /api/v1/scheduling/overview
   * Get scheduling risk overview for all active jobs
   */
  @Get('overview')
  async getSchedulingOverview(): Promise<SchedulingRiskDTO[]> {
    return this.schedulingService.getSchedulingOverview();
  }

  /**
   * GET /api/v1/scheduling/jobs/:jobId
   * Get scheduling risk for a specific job
   */
  @Get('jobs/:jobId')
  async getSchedulingForJob(@Param('jobId') jobId: string): Promise<SchedulingRiskDTO | null> {
    return this.schedulingService.getSchedulingForJob(jobId);
  }
}
