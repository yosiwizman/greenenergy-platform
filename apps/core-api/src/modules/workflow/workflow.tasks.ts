import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { WorkflowService } from './workflow.service';

/**
 * WorkflowTasks handles scheduled workflow automation operations
 */
@Injectable()
export class WorkflowTasks {
  private readonly logger = new Logger(WorkflowTasks.name);

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Run workflow automation daily at 4 AM
   * 
   * Controlled by WORKFLOW_AUTOMATION_ENABLED environment variable (default: false)
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleDailyWorkflows(): Promise<void> {
    const enabled = this.configService.get<string>('WORKFLOW_AUTOMATION_ENABLED', 'false') === 'true';

    if (!enabled) {
      this.logger.debug('Workflow automation is DISABLED (WORKFLOW_AUTOMATION_ENABLED=false)');
      return;
    }

    const limit = Number(this.configService.get<string>('WORKFLOW_AUTOMATION_DAILY_LIMIT', '500'));

    this.logger.log(`Starting scheduled workflow automation (limit: ${limit})`);

    try {
      const result = await this.workflowService.runForAllActiveJobs(limit);

      this.logger.log(
        `Scheduled workflow automation complete: processed=${result.processed} actions=${result.actions}`
      );
    } catch (error) {
      this.logger.error(
        'Scheduled workflow automation failed:',
        error instanceof Error ? error.stack : String(error)
      );
      // Don't rethrow - we don't want to crash the app on workflow failures
    }
  }
}
