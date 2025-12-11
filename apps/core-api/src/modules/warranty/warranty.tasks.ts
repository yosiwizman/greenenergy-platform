import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { WarrantyService } from './warranty.service';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class WarrantyTasks {
  private readonly logger = new Logger(WarrantyTasks.name);

  constructor(
    private readonly warrantyService: WarrantyService,
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * Process expiring warranties daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpiringWarranties(): Promise<void> {
    const days = Number(this.configService.get('WARRANTY_EXPIRY_NOTICE_DAYS')) || 30;

    this.logger.log(`Running expiring warranties check (${days} days threshold)`);

    try {
      await this.warrantyService.processExpiringWarranties(days);
      this.logger.log('Expiring warranties check completed successfully');

      // Record successful cron run for monitoring
      this.metricsService.setCronLastRunTimestamp('warranty_expiry_check');
    } catch (error) {
      this.logger.error(
        `Failed processing expiring warranties (days=${days}):`,
        error instanceof Error ? error.stack : String(error)
      );
    }
  }
}
