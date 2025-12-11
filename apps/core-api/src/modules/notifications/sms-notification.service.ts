import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export interface SendCustomerSmsParams {
  toPhone: string;
  body: string;
  jobId?: string;
  contextLabel?: string;
}

@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);
  private twilioClient: Twilio | null = null;
  private fromNumber: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<string>('NOTIFICATIONS_SMS_PROVIDER', 'twilio');
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (provider.toLowerCase() === 'twilio' && accountSid && authToken && fromNumber) {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.fromNumber = fromNumber;
        this.logger.log('Twilio SMS client initialized successfully');
      } catch (error) {
        this.logger.error(
          `Failed to initialize Twilio client: ${error instanceof Error ? error.message : String(error)}`
        );
        this.twilioClient = null;
      }
    } else {
      if (!accountSid || !authToken || !fromNumber) {
        this.logger.warn(
          'SMS notifications not configured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER missing. SMS sending disabled.'
        );
      } else if (provider.toLowerCase() !== 'twilio') {
        this.logger.warn(`Unsupported SMS provider: ${provider}. SMS sending disabled.`);
      }
    }
  }

  /**
   * Send an SMS to a customer
   */
  async sendCustomerSms(params: SendCustomerSmsParams): Promise<void> {
    const { toPhone, body, jobId, contextLabel } = params;

    // If SMS service is not configured, log and return without throwing
    if (!this.twilioClient || !this.fromNumber) {
      this.logger.warn(
        `SMS service not configured - skipping SMS to ${toPhone} for job ${jobId ?? 'N/A'}`
      );
      return;
    }

    try {
      this.logger.log(
        `Sending SMS to ${toPhone} for job ${jobId ?? 'N/A'}${contextLabel ? ` (${contextLabel})` : ''}`
      );

      await this.twilioClient.messages.create({
        to: toPhone,
        from: this.fromNumber,
        body,
      });

      this.logger.log(
        `Successfully sent SMS to ${toPhone} for job ${jobId ?? 'N/A'}${contextLabel ? ` (${contextLabel})` : ''}`
      );
    } catch (error) {
      // Log error but don't throw - we don't want SMS failures to break message creation
      this.logger.error(
        `Failed to send SMS to ${toPhone} for job ${jobId ?? 'N/A'}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
