import { Controller, Get, Post, Param, Query, UseGuards, Logger, Body } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  WorkflowRuleSummaryDTO,
  WorkflowActionLogDTO,
  RunWorkflowForJobResponse,
  RunAllWorkflowsResponse,
} from '@greenenergy/shared-types';

/**
 * WorkflowController exposes internal APIs for workflow automation
 * All endpoints are protected by InternalApiKeyGuard
 */
@Controller('api/v1/workflows')
@UseGuards(InternalApiKeyGuard)
export class WorkflowController {
  private readonly logger = new Logger(WorkflowController.name);

  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * GET /api/v1/workflows/rules
   * Get list of all workflow rules
   */
  @Get('rules')
  getRules(): WorkflowRuleSummaryDTO[] {
    return this.workflowService.getRuleSummaries();
  }

  /**
   * GET /api/v1/workflows/logs
   * Get recent workflow action logs with optional filters
   */
  @Get('logs')
  async getLogs(
    @Query('jobId') jobId?: string,
    @Query('ruleKey') ruleKey?: string,
    @Query('limit') limit?: string
  ): Promise<WorkflowActionLogDTO[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.workflowService.getRecentLogs({
      jobId,
      ruleKey,
      limit: limitNum,
    });
  }

  /**
   * POST /api/v1/workflows/jobs/:jobId/run
   * Manually run all workflows for a specific job
   */
  @Post('jobs/:jobId/run')
  async runForJob(@Param('jobId') jobId: string): Promise<RunWorkflowForJobResponse> {
    this.logger.log(`Manual workflow execution requested for job: ${jobId}`);

    const actions = await this.workflowService.runForJob(jobId);

    return {
      jobId,
      actions,
    };
  }

  /**
   * POST /api/v1/workflows/run-all
   * Manually run workflows for all active jobs
   */
  @Post('run-all')
  async runAll(@Body() body?: { limit?: number }): Promise<RunAllWorkflowsResponse> {
    const limit = body?.limit || 500;

    this.logger.log(`Manual workflow execution requested for all active jobs (limit: ${limit})`);

    const result = await this.workflowService.runForAllActiveJobs(limit);

    return result;
  }
}
