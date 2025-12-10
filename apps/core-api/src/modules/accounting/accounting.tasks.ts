import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AccountingService } from './accounting.service';

/**
 * AccountingTasks handles scheduled QuickBooks sync operations
 */
@Injectable()
export class AccountingTasks {
  private readonly logger = new Logger(AccountingTasks.name);

  constructor(
    private readonly accountingService: AccountingService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sync all active jobs from QuickBooks daily at 2 AM
   * 
   * Controlled by QB_SYNC_ENABLED environment variable (default: false)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyQuickbooksSync(): Promise<void> {
    const syncEnabled = this.configService.get<string>('QB_SYNC_ENABLED', 'false') === 'true';

    if (!syncEnabled) {
      this.logger.debug('QuickBooks scheduled sync is DISABLED (QB_SYNC_ENABLED=false)');
      return;
    }

    this.logger.log('Starting scheduled QuickBooks sync for all active jobs');

    try {
      await this.accountingService.syncAllActiveJobsFromQuickbooks();
      this.logger.log('Scheduled QuickBooks sync completed successfully');
    } catch (error) {
      this.logger.error(
        'Failed during scheduled QuickBooks sync:',
        error instanceof Error ? error.stack : String(error),
      );
      // Don't rethrow - we don't want to crash the app on sync failures
    }
  }
}
