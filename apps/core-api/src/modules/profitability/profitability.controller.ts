import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfitabilityService } from './profitability.service';
import type {
  JobProfitabilityDTO,
  ProfitDashboardSummaryDTO,
  JobProfitabilityLevel,
} from '@greenenergy/shared-types';

@Controller('api/v1/profit')
export class ProfitabilityController {
  constructor(private readonly profitabilityService: ProfitabilityService) {}

  /**
   * GET /api/v1/profit/dashboard/summary
   * Get aggregated dashboard summary metrics
   */
  @Get('dashboard/summary')
  async getDashboardSummary(): Promise<ProfitDashboardSummaryDTO> {
    return this.profitabilityService.getProfitDashboardSummary();
  }

  /**
   * GET /api/v1/profit/dashboard/jobs
   * Get list of jobs with profitability data
   * Query params: profitabilityLevel?, riskLevel?
   */
  @Get('dashboard/jobs')
  async getDashboardJobs(
    @Query('profitabilityLevel') profitabilityLevel?: JobProfitabilityLevel,
    @Query('riskLevel') riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH',
  ): Promise<JobProfitabilityDTO[]> {
    const filter = {
      profitabilityLevel,
      riskLevel,
    };

    return this.profitabilityService.listJobFinancialSnapshots(filter);
  }

  /**
   * GET /api/v1/profit/jobs/:jobId
   * Get financial snapshot for a specific job
   */
  @Get('jobs/:jobId')
  async getJobFinancialSnapshot(
    @Param('jobId') jobId: string,
  ): Promise<JobProfitabilityDTO> {
    return this.profitabilityService.getJobFinancialSnapshot(jobId);
  }

  /**
   * POST /api/v1/profit/jobs/:jobId/recalculate
   * Trigger recompute of one job's financial snapshot
   */
  @Post('jobs/:jobId/recalculate')
  @HttpCode(HttpStatus.OK)
  async recalculateJob(@Param('jobId') jobId: string): Promise<JobProfitabilityDTO> {
    return this.profitabilityService.recalculateJobFinancialSnapshot(jobId);
  }

  /**
   * POST /api/v1/profit/recalculate-all
   * Trigger recompute of all job snapshots
   */
  @Post('recalculate-all')
  @HttpCode(HttpStatus.OK)
  async recalculateAll(): Promise<{ success: boolean }> {
    await this.profitabilityService.recalculateAllSnapshots();
    return { success: true };
  }
}
