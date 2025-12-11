import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { MetricsService } from '../metrics/metrics.service';
import type {
  OpsStatusDTO,
  ExternalServiceHealthDTO,
  CronJobStatusDTO,
  ExternalServiceStatus,
} from '@greenenergy/shared-types';

/**
 * Service that aggregates platform health status for ops monitoring.
 * Performs lightweight health checks on database, external services, and cron jobs.
 */
@Injectable()
export class OpsStatusService {
  private readonly logger = new Logger(OpsStatusService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {}

  async getOpsStatus(): Promise<OpsStatusDTO> {
    const generatedAt = new Date().toISOString();

    // Check database health
    const databaseHealthy = await this.checkDatabaseHealth();

    // Check external services
    const externalServices: ExternalServiceHealthDTO[] = [
      await this.checkJobNimbusHealth(),
      await this.checkQuickBooksHealth(),
      await this.checkEmailHealth(),
      await this.checkSmsHealth(),
    ];

    // Get cron job status from metrics
    const latestCronRuns = await this.getCronJobsStatus();

    // Core API is considered healthy if we can generate this status
    const coreApiHealthy = true;

    return {
      generatedAt,
      coreApiHealthy,
      databaseHealthy,
      externalServices,
      latestCronRuns,
    };
  }

  /**
   * Check database health with a simple query
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // Simple query to verify database connectivity
      await prisma.$queryRaw`SELECT 1 as health_check`;
      return true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Check JobNimbus configuration and connectivity
   */
  private async checkJobNimbusHealth(): Promise<ExternalServiceHealthDTO> {
    const lastCheckedAt = new Date().toISOString();
    const name = 'jobnimbus';

    try {
      const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');
      const apiUrl = this.configService.get<string>('JOBNIMBUS_API_URL');

      if (!apiKey || !apiUrl) {
        return {
          name,
          status: 'DOWN',
          lastCheckedAt,
          details: 'Configuration missing (JOBNIMBUS_API_KEY or JOBNIMBUS_API_URL)',
        };
      }

      // If configured, assume UP (avoid making actual network calls in v1)
      return {
        name,
        status: 'UP',
        lastCheckedAt,
        details: 'Configuration present',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`JobNimbus health check error: ${errorMessage}`);
      return {
        name,
        status: 'DOWN',
        lastCheckedAt,
        details: errorMessage,
      };
    }
  }

  /**
   * Check QuickBooks configuration and connectivity
   */
  private async checkQuickBooksHealth(): Promise<ExternalServiceHealthDTO> {
    const lastCheckedAt = new Date().toISOString();
    const name = 'quickbooks';

    try {
      const clientId = this.configService.get<string>('QUICKBOOKS_CLIENT_ID');
      const clientSecret = this.configService.get<string>('QUICKBOOKS_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return {
          name,
          status: 'DOWN',
          lastCheckedAt,
          details: 'Configuration missing (QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET)',
        };
      }

      // Check if we have valid tokens in database
      const activeConnection = await (prisma as any).quickBooksAuth?.findFirst({
        where: {
          isActive: true,
        },
      });

      if (!activeConnection) {
        return {
          name,
          status: 'DEGRADED',
          lastCheckedAt,
          details: 'Configuration present but no active OAuth connection',
        };
      }

      return {
        name,
        status: 'UP',
        lastCheckedAt,
        details: 'Active OAuth connection found',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`QuickBooks health check error: ${errorMessage}`);
      return {
        name,
        status: 'DOWN',
        lastCheckedAt,
        details: errorMessage,
      };
    }
  }

  /**
   * Check email service configuration
   */
  private async checkEmailHealth(): Promise<ExternalServiceHealthDTO> {
    const lastCheckedAt = new Date().toISOString();
    const name = 'email';

    try {
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS');

      if (!smtpHost || !smtpUser || !smtpPass) {
        return {
          name,
          status: 'DOWN',
          lastCheckedAt,
          details: 'SMTP configuration incomplete',
        };
      }

      return {
        name,
        status: 'UP',
        lastCheckedAt,
        details: 'SMTP configuration present',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email health check error: ${errorMessage}`);
      return {
        name,
        status: 'DOWN',
        lastCheckedAt,
        details: errorMessage,
      };
    }
  }

  /**
   * Check SMS service configuration (Twilio)
   */
  private async checkSmsHealth(): Promise<ExternalServiceHealthDTO> {
    const lastCheckedAt = new Date().toISOString();
    const name = 'sms';

    try {
      const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      const fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER');

      if (!accountSid || !authToken || !fromPhone) {
        return {
          name,
          status: 'DOWN',
          lastCheckedAt,
          details: 'Twilio configuration incomplete (optional service)',
        };
      }

      return {
        name,
        status: 'UP',
        lastCheckedAt,
        details: 'Twilio configuration present',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMS health check error: ${errorMessage}`);
      return {
        name,
        status: 'DOWN',
        lastCheckedAt,
        details: errorMessage,
      };
    }
  }

  /**
   * Get cron job status from metrics registry
   */
  private async getCronJobsStatus(): Promise<CronJobStatusDTO[]> {
    try {
      // Get all metrics as text and parse cron job timestamps
      const metricsText = await this.metricsService.getMetrics();
      const cronJobs = this.parseCronMetrics(metricsText);
      return cronJobs;
    } catch (error) {
      this.logger.error(`Failed to get cron job status: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Parse cron job metrics from Prometheus text format
   */
  private parseCronMetrics(metricsText: string): CronJobStatusDTO[] {
    const cronJobs: CronJobStatusDTO[] = [];
    const lines = metricsText.split('\n');

    for (const line of lines) {
      // Look for lines like: cron_jobs_last_run_timestamp{job_name="workflow_engine"} 1234567890.123
      if (line.startsWith('cron_jobs_last_run_timestamp{')) {
        const jobNameMatch = line.match(/job_name="([^"]+)"/);
        const timestampMatch = line.match(/}\s+([\d.]+)/);

        if (jobNameMatch && timestampMatch && jobNameMatch[1] && timestampMatch[1]) {
          const jobName: string = jobNameMatch[1];
          const timestampSeconds = parseFloat(timestampMatch[1]);
          const lastRunAt: string | null = timestampSeconds > 0 
            ? new Date(timestampSeconds * 1000).toISOString()
            : null;

          cronJobs.push({
            name: jobName,
            lastRunAt,
          });
        }
      }
    }

    return cronJobs;
  }
}
