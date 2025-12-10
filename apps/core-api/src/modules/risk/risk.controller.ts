import { Controller, Post, Get, Param, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { RiskService } from './risk.service';
import { JobRiskSnapshotDTO } from '@greenenergy/shared-types';

@Controller('risk')
export class RiskController {
  private readonly logger = new Logger(RiskController.name);

  constructor(private readonly riskService: RiskService) {}

  /**
   * POST /risk/jobs/:jobId/evaluate
   * Trigger risk evaluation for a single job
   */
  @Post('jobs/:jobId/evaluate')
  async evaluateJobRisk(@Param('jobId') jobId: string): Promise<JobRiskSnapshotDTO> {
    this.logger.log(`Received request to evaluate risk for jobId=${jobId}`);
    try {
      const result = await this.riskService.evaluateJobRisk(jobId);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to evaluate risk for job ${jobId}: ${err.message}`, err.stack);
      throw new HttpException(
        `Risk evaluation failed: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /risk/evaluate-all
   * Trigger risk evaluation for all jobs
   * NOTE: This is a potentially heavy operation. Consider restricting access.
   */
  @Post('evaluate-all')
  async evaluateAllJobs(): Promise<{
    totalJobs: number;
    evaluated: number;
    errors: string[];
  }> {
    this.logger.log('Received request to evaluate risk for all jobs');
    try {
      const result = await this.riskService.evaluateAllJobsRisk();
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to evaluate risk for all jobs: ${err.message}`, err.stack);
      throw new HttpException(
        `Bulk risk evaluation failed: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /risk/jobs
   * Get risk snapshots for all jobs
   */
  @Get('jobs')
  async getAllJobRisks(): Promise<JobRiskSnapshotDTO[]> {
    this.logger.log('Fetching risk snapshots for all jobs');
    try {
      const risks = await this.riskService.getAllJobRisks();
      return risks;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch all job risks: ${err.message}`, err.stack);
      throw new HttpException(
        `Failed to retrieve job risks: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /risk/jobs/:jobId
   * Get the latest risk snapshot for a single job
   */
  @Get('jobs/:jobId')
  async getJobRiskSnapshot(@Param('jobId') jobId: string): Promise<JobRiskSnapshotDTO | null> {
    this.logger.log(`Fetching risk snapshot for jobId=${jobId}`);
    try {
      const risk = await this.riskService.getJobRiskSnapshot(jobId);
      if (!risk) {
        throw new HttpException(`No risk snapshot found for job ${jobId}`, HttpStatus.NOT_FOUND);
      }
      return risk;
    } catch (error) {
      const err = error as Error;
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(
        `Failed to fetch risk snapshot for job ${jobId}: ${err.message}`,
        err.stack
      );
      throw new HttpException(
        `Failed to retrieve risk snapshot: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
