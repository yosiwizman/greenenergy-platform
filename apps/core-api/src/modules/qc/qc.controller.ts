import { Controller, Post, Get, Param, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { QCService } from './qc.service';
import { QCCheckResult, JobQCOverview } from '@greenenergy/shared-types';

@Controller('qc')
export class QcController {
  private readonly logger = new Logger(QcController.name);

  constructor(private readonly qcService: QCService) {}

  /**
   * POST /qc/jobs/:jobId/evaluate
   * Trigger QC evaluation for a single job.
   */
  @Post('jobs/:jobId/evaluate')
  async evaluateJobQC(@Param('jobId') jobId: string): Promise<QCCheckResult> {
    this.logger.log(`Received request to evaluate QC for jobId=${jobId}`);
    try {
      const result = await this.qcService.evaluateJobQC(jobId);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to evaluate QC for job ${jobId}: ${err.message}`, err.stack);
      throw new HttpException(
        `QC evaluation failed: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * POST /qc/evaluate-all
   * Trigger QC evaluation for all jobs.
   */
  @Post('evaluate-all')
  async evaluateAllJobs(): Promise<{
    totalJobs: number;
    evaluated: number;
    errors: string[];
  }> {
    this.logger.log('Received request to evaluate QC for all jobs');
    try {
      const result = await this.qcService.evaluateAllJobsQC();
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to evaluate QC for all jobs: ${err.message}`, err.stack);
      throw new HttpException(
        `Bulk QC evaluation failed: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /qc/jobs/:jobId
   * Get the latest QC check result for a single job.
   */
  @Get('jobs/:jobId')
  async getJobQCStatus(@Param('jobId') jobId: string): Promise<QCCheckResult | null> {
    this.logger.log(`Fetching latest QC result for jobId=${jobId}`);
    try {
      const result = await this.qcService.getLatestQCResult(jobId);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch QC result for job ${jobId}: ${err.message}`, err.stack);
      throw new HttpException(
        `Failed to retrieve QC status: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /qc/jobs
   * Get QC overview for all jobs.
   */
  @Get('jobs')
  async getQCOverview(): Promise<JobQCOverview[]> {
    this.logger.log('Fetching QC overview for all jobs');
    try {
      const overview = await this.qcService.getQCOverview();
      return overview;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to fetch QC overview: ${err.message}`, err.stack);
      throw new HttpException(
        `Failed to retrieve QC overview: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
