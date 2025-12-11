import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendCustomerMessageEmailParams {
  toEmail: string;
  jobId: string;
  messageTitle: string;
  messageBody: string;
  isAiGenerated?: boolean;
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
}
