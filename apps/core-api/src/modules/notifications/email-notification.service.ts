import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { ExecutiveDigestDTO } from '@greenenergy/shared-types';

export interface SendCustomerMessageEmailParams {
  toEmail: string;
  jobId: string;
  messageTitle: string;
  messageBody: string;
  isAiGenerated?: boolean;
}

export interface SendExecutiveDigestEmailParams {
  digest: ExecutiveDigestDTO;
  recipients: string[];
}

@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger(EmailNotificationService.name);
  private resendClient: Resend | null = null;
  private fromEmail: string | null = null;
  private provider: string;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('NOTIFICATIONS_EMAIL_PROVIDER', 'resend');
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('NOTIFICATIONS_FROM_EMAIL') || null;

    // Initialize Resend client if provider is "resend" and credentials are present
    if (this.provider.toLowerCase() === 'resend' && apiKey && this.fromEmail) {
      try {
        this.resendClient = new Resend(apiKey);
        this.logger.log('Resend email client initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize Resend client', error);
        this.resendClient = null;
      }
    } else {
      if (!apiKey || !this.fromEmail) {
        this.logger.warn(
          'Email notifications not configured: RESEND_API_KEY or NOTIFICATIONS_FROM_EMAIL missing. Email sending disabled.',
        );
      } else if (this.provider.toLowerCase() !== 'resend') {
        this.logger.warn(
          `Unsupported email provider: ${this.provider}. Email sending disabled.`,
        );
      }
    }
  }

  /**
   * Send a customer message email
   */
  async sendCustomerMessageEmail(params: SendCustomerMessageEmailParams): Promise<void> {
    // If email service is not configured, log and return without throwing
    if (!this.resendClient || !this.fromEmail) {
      this.logger.warn(
        `Email service not configured - skipping email to ${params.toEmail} for job ${params.jobId}`,
      );
      return;
    }

    try {
      const subject = `Green Energy update for Job #${params.jobId}: ${params.messageTitle}`;
      const body = this.buildEmailBody(params);

      this.logger.log(`Sending customer message email to ${params.toEmail} for job ${params.jobId}`);

      await this.resendClient.emails.send({
        from: this.fromEmail,
        to: params.toEmail,
        subject,
        text: body,
      });

      this.logger.log(`Successfully sent email to ${params.toEmail} for job ${params.jobId}`);
    } catch (error) {
      // Log error but don't throw - we don't want email failures to break message creation
      this.logger.error(
        `Failed to send email to ${params.toEmail} for job ${params.jobId}`,
        error,
      );
    }
  }

  /**
   * Send executive digest email
   */
  async sendExecutiveDigestEmail(params: SendExecutiveDigestEmailParams): Promise<void> {
    const { digest, recipients } = params;

    if (!this.resendClient || !this.fromEmail) {
      this.logger.warn(
        'EmailNotificationService.sendExecutiveDigestEmail: provider not configured or no from address',
      );
      return;
    }

    if (!recipients.length) {
      this.logger.warn('EmailNotificationService.sendExecutiveDigestEmail: no recipients provided');
      return;
    }

    try {
      const periodEndDate = new Date(digest.periodEnd).toLocaleDateString();
      const subject = `Green Energy Weekly Executive Digest – week of ${periodEndDate}`;
      const body = this.buildExecutiveDigestBody(digest);

      this.logger.log(`Sending executive digest to ${recipients.length} recipient(s)`);

      // Send to each recipient
      for (const recipient of recipients) {
        await this.resendClient.emails.send({
          from: this.fromEmail,
          to: recipient,
          subject,
          text: body,
        });
      }

      this.logger.log('Successfully sent executive digest emails');
    } catch (error) {
      this.logger.error('Failed to send executive digest emails', error);
      // Don't throw - we don't want email failures to break the service
    }
  }

  /**
   * Build email body text
   */
  private buildEmailBody(params: SendCustomerMessageEmailParams): string {
    const lines: string[] = [
      'Hello,',
      '',
      params.messageBody,
      '',
      `Job Reference: #${params.jobId}`,
    ];

    if (params.isAiGenerated) {
      lines.push('', '(This message was AI-assisted)');
    }

    lines.push(
      '',
      '---',
      'Green Energy Solar',
      'Your trusted solar installation partner',
    );

    return lines.join('\n');
  }

  /**
   * Build executive digest email body
   */
  private buildExecutiveDigestBody(digest: ExecutiveDigestDTO): string {
    const periodStart = new Date(digest.periodStart).toLocaleDateString();
    const periodEnd = new Date(digest.periodEnd).toLocaleDateString();

    const lines: string[] = [
      'GREEN ENERGY WEEKLY EXECUTIVE DIGEST',
      '='.repeat(50),
      '',
      `Period: ${periodStart} – ${periodEnd}`,
      `Generated: ${new Date(digest.generatedAt).toLocaleString()}`,
      '',
      '',
      '📊 KEY METRICS',
      '─'.repeat(50),
      '',
      `High-Risk Jobs: ${digest.keyCounts.highRiskJobs}`,
      `Open Safety Incidents: ${digest.keyCounts.safetyIncidentsOpen}`,
      `Overdue AR Jobs: ${digest.keyCounts.overdueArJobs}`,
      `Workflows Triggered (Period): ${digest.keyCounts.workflowsTriggeredLastPeriod}`,
      '',
      '',
      '💰 FINANCE & AR SUMMARY',
      '─'.repeat(50),
      '',
      `Total Outstanding AR: $${digest.financeArSummary.totalOutstanding.toLocaleString()}`,
      `Total Paid: $${digest.financeArSummary.totalPaid.toLocaleString()}`,
      `Total Contract Value: $${digest.financeArSummary.totalContractValue.toLocaleString()}`,
      '',
      `Jobs Paid: ${digest.financeArSummary.jobsPaid}`,
      `Jobs Partially Paid: ${digest.financeArSummary.jobsPartiallyPaid}`,
      `Jobs Unpaid: ${digest.financeArSummary.jobsUnpaid}`,
      `Jobs Overdue: ${digest.financeArSummary.jobsOverdue}`,
      '',
      '',
      '📅 AR AGING SUMMARY',
      '─'.repeat(50),
      '',
    ];

    // Add aging buckets
    for (const bucket of digest.financeAgingSummary.buckets) {
      lines.push(
        `${bucket.bucket}: $${bucket.outstanding.toLocaleString()} (${bucket.jobsCount} jobs)`,
      );
    }

    lines.push(
      '',
      '',
      '📈 CASHFLOW & PIPELINE FORECAST',
      '─'.repeat(50),
      '',
      `Forecast Horizon: ${digest.forecastOverview.cashflow.horizonWeeks} weeks`,
      '',
      'Pipeline:',
      `  Total Pipeline: $${digest.forecastOverview.pipeline.totalPipelineAmount.toLocaleString()}`,
      `  Weighted Pipeline: $${digest.forecastOverview.pipeline.totalWeightedAmount.toLocaleString()}`,
      `  Buckets: ${digest.forecastOverview.pipeline.buckets.length}`,
      '',
      'Top 3 Pipeline Stages:',
    );

    // Add top 3 pipeline buckets
    const topBuckets = digest.forecastOverview.pipeline.buckets.slice(0, 3);
    for (const bucket of topBuckets) {
      lines.push(
        `  ${bucket.statusLabel}: $${bucket.weightedAmount.toLocaleString()} (${bucket.jobsCount} jobs)`,
      );
    }

    lines.push(
      '',
      '',
      '─'.repeat(50),
      'Green Energy Solar',
      'Executive Dashboard: [Internal Dashboard URL]',
      '',
    );

    return lines.join('\n');
  }
}
