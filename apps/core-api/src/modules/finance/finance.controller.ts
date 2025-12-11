import { Controller, Get, Query, Param, UseGuards, Logger } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { ArSummaryDTO, JobArDetailsDTO, JobArStatus } from '@greenenergy/shared-types';

/**
 * Finance API Controller (Phase 5 Sprint 1)
 * Provides read-only AR and payment tracking endpoints
 */
@Controller('api/v1/finance')
@UseGuards(InternalApiKeyGuard)
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(private readonly financeService: FinanceService) {}

  /**
   * GET /api/v1/finance/ar/summary
   * Returns aggregated AR metrics across all jobs
   */
  @Get('ar/summary')
  async getArSummary(): Promise<ArSummaryDTO> {
    this.logger.log('GET /api/v1/finance/ar/summary');
    return this.financeService.getArSummary();
  }

  /**
   * GET /api/v1/finance/ar/jobs
   * Returns list of jobs with AR details
   * Optional query param: ?status=OVERDUE|UNPAID|PARTIALLY_PAID|PAID
   */
  @Get('ar/jobs')
  async listJobsWithArDetails(
    @Query('status') status?: JobArStatus,
  ): Promise<JobArDetailsDTO[]> {
    this.logger.log(`GET /api/v1/finance/ar/jobs?status=${status || ''}`);
    return this.financeService.listJobsWithArDetails(status);
  }

  /**
   * GET /api/v1/finance/ar/jobs/:jobId
   * Returns AR details for a specific job
   */
  @Get('ar/jobs/:jobId')
  async getJobArDetails(@Param('jobId') jobId: string): Promise<JobArDetailsDTO> {
    this.logger.log(`GET /api/v1/finance/ar/jobs/${jobId}`);
    return this.financeService.getJobArDetails(jobId);
  }
}
