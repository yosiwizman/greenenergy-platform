import { Controller, Get, Post, Param, Query, Body, UseGuards, Logger } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  DispatchOverviewDTO,
  DispatchRecommendationDTO,
} from '@greenenergy/shared-types';

/**
 * DispatchController exposes AI dispatch endpoints for the internal dashboard
 * All endpoints are protected by InternalApiKeyGuard
 */
@Controller('api/v1/dispatch')
@UseGuards(InternalApiKeyGuard)
export class DispatchController {
  private readonly logger = new Logger(DispatchController.name);

  constructor(private readonly dispatchService: DispatchService) {}

  /**
   * GET /api/v1/dispatch/overview?date=YYYY-MM-DD
   * Get dispatch overview for a specific date (defaults to today)
   */
  @Get('overview')
  async getOverview(@Query('date') dateStr?: string): Promise<DispatchOverviewDTO> {
    const date = dateStr ? new Date(dateStr) : new Date();
    this.logger.log(`Dispatch overview requested for date: ${date.toISOString()}`);
    return this.dispatchService.getOverviewForDate(date);
  }

  /**
   * GET /api/v1/dispatch/jobs/:jobId?date=YYYY-MM-DD
   * Get dispatch recommendation for a single job
   */
  @Get('jobs/:jobId')
  async getJobRecommendations(
    @Param('jobId') jobId: string,
    @Query('date') dateStr?: string,
  ): Promise<DispatchRecommendationDTO | null> {
    const date = dateStr ? new Date(dateStr) : new Date();
    this.logger.log(`Dispatch recommendation requested for job ${jobId}, date: ${date.toISOString()}`);
    return this.dispatchService.getRecommendationsForJob(jobId, date);
  }

  /**
   * POST /api/v1/dispatch/jobs/:jobId/assign
   * Assign a subcontractor to a job for a specific date
   */
  @Post('jobs/:jobId/assign')
  async assignSub(
    @Param('jobId') jobId: string,
    @Body() body: { subcontractorId: string; scheduledDate: string },
  ): Promise<{ success: boolean }> {
    this.logger.log(`Assignment requested for job ${jobId}, subcontractor ${body.subcontractorId}`);
    const scheduledDate = new Date(body.scheduledDate);
    await this.dispatchService.assignSubcontractorToJob(jobId, body.subcontractorId, scheduledDate);
    return { success: true };
  }
}
