import { Controller, Post, Param, UseGuards, Logger } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

/**
 * AccountingController exposes internal APIs for syncing financial data
 * from QuickBooks to JobFinancialSnapshot records.
 *
 * All endpoints are protected by InternalApiKeyGuard.
 */
@Controller('accounting')
@UseGuards(InternalApiKeyGuard)
export class AccountingController {
  private readonly logger = new Logger(AccountingController.name);

  constructor(private readonly accountingService: AccountingService) {}

  /**
   * POST /api/v1/accounting/jobs/:jobId/sync
   * Sync a single job's financial data from QuickBooks
   */
  @Post('jobs/:jobId/sync')
  async syncJob(@Param('jobId') jobId: string) {
    this.logger.log(`Received request to sync job ${jobId} from QuickBooks`);

    const snapshot = await this.accountingService.syncJobFromQuickbooks(jobId);

    return {
      jobId: snapshot.jobId,
      contractAmount: snapshot.contractAmount,
      accountingSource: snapshot.accountingSource,
      accountingLastSyncAt: snapshot.accountingLastSyncAt?.toISOString() || null,
    };
  }

  /**
   * POST /api/v1/accounting/sync-all
   * Sync all active jobs from QuickBooks
   */
  @Post('sync-all')
  async syncAll() {
    this.logger.log('Received request to sync all active jobs from QuickBooks');

    await this.accountingService.syncAllActiveJobsFromQuickbooks();

    return {
      success: true,
      message: 'Sync completed. Check logs for details.',
    };
  }
}
