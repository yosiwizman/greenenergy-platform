import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { prisma } from '@greenenergy/db';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import type { ExecutiveDigestDTO, ExecutiveDigestKeyCountsDTO } from '@greenenergy/shared-types';
import { FinanceService } from '../finance/finance.service';
import { ForecastService } from '../forecast/forecast.service';
import { CommandCenterService } from '../command-center/command-center.service';
import { EmailNotificationService } from '../notifications/email-notification.service';

/**
 * ExecutiveReportService - Phase 6 Sprint 2
 * Composes weekly digest emails for executives with finance, forecast, and operational metrics
 */
@Injectable()
export class ExecutiveReportService {
  private readonly logger = new Logger(ExecutiveReportService.name);

  constructor(
    private readonly financeService: FinanceService,
    private readonly forecastService: ForecastService,
    private readonly commandCenterService: CommandCenterService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Calculate the digest period (previous week Monday-Sunday)
   */
  private getDigestPeriod(now: Date = new Date()): { periodStart: Date; periodEnd: Date } {
    // Get the start of the previous week (Monday)
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const previousWeekStart = subWeeks(currentWeekStart, 1);
    
    // Get the end of the previous week (Sunday)
    const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 });

    return {
      periodStart: previousWeekStart,
      periodEnd: previousWeekEnd,
    };
  }

  /**
   * Build the weekly executive digest
   */
  async buildWeeklyDigest(now = new Date()): Promise<ExecutiveDigestDTO> {
    this.logger.log('Building weekly executive digest');

    const { periodStart, periodEnd } = this.getDigestPeriod(now);

    // Fetch data from all services in parallel
    const [arSummary, agingSummary, forecastOverview, commandCenterOverview] =
      await Promise.all([
        this.financeService.getArSummary(),
        this.financeService.getArAgingSummary(),
        this.forecastService.getForecastOverview(12),
        this.commandCenterService.getOverview(),
      ]);

    // Compute key counts
    const keyCounts = await this.computeKeyCounts(periodStart, periodEnd, commandCenterOverview, arSummary);

    return {
      generatedAt: new Date().toISOString(),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      financeArSummary: arSummary,
      financeAgingSummary: agingSummary,
      forecastOverview,
      keyCounts,
    };
  }

  /**
   * Compute key operational counts for the digest
   */
  private async computeKeyCounts(
    periodStart: Date,
    periodEnd: Date,
    commandCenterOverview: any,
    arSummary: any,
  ): Promise<ExecutiveDigestKeyCountsDTO> {
    // High risk jobs (current snapshot)
    const highRiskJobs = commandCenterOverview.summary.jobsHighRisk || 0;

    // Open safety incidents (current snapshot)
    const safetyIncidentsOpen = commandCenterOverview.summary.openSafetyIncidents || 0;

    // Overdue AR jobs (from AR summary)
    const overdueArJobs = arSummary.jobsOverdue || 0;

    // Workflows triggered in the period
    const workflowsTriggeredLastPeriod = await prisma.workflowActionLog.count({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    return {
      highRiskJobs,
      safetyIncidentsOpen,
      overdueArJobs,
      workflowsTriggeredLastPeriod,
    };
  }

  /**
   * Send the weekly digest email to configured recipients
   */
  async sendWeeklyDigest(
    now = new Date(),
    options?: { recipientsOverride?: string[] },
  ): Promise<void> {
    this.logger.log('Sending weekly executive digest');

    const digest = await this.buildWeeklyDigest(now);

    // Get recipients from config or override
    const recipientsEnv =
      options?.recipientsOverride ??
      this.configService
        .get<string>('EXEC_DIGEST_RECIPIENTS')
        ?.split(',')
        .map((r) => r.trim())
        .filter(Boolean) ??
      [];

    if (!recipientsEnv.length) {
      this.logger.warn(
        'ExecutiveReportService.sendWeeklyDigest: no EXEC_DIGEST_RECIPIENTS configured',
      );
      return;
    }

    await this.emailNotificationService.sendExecutiveDigestEmail({
      digest,
      recipients: recipientsEnv,
    });

    this.logger.log(`Weekly digest sent to ${recipientsEnv.length} recipient(s)`);
  }

  /**
   * Scheduled cron job: every Monday at 7:00 AM
   */
  @Cron('0 7 * * MON')
  async handleWeeklyDigestCron() {
    this.logger.log('Weekly digest cron triggered');
    try {
      await this.sendWeeklyDigest(new Date());
    } catch (error) {
      this.logger.error('Failed to send weekly digest via cron', error);
    }
  }
}
