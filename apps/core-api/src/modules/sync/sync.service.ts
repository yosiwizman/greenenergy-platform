import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  JobNimbusClient,
  transformJobNimbusJob,
  transformJobNimbusContact,
  JobNimbusError,
} from '@greenenergy/jobnimbus-sdk';
import { prisma } from '@greenenergy/db';

export interface SyncSummary {
  success: boolean;
  jobsFetched: number;
  jobsUpserted: number;
  jobsUnchanged: number;
  contactsFetched: number;
  contactsUpserted: number;
  startedAt: Date;
  finishedAt: Date;
  errors: string[];
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private jobNimbusClient!: JobNimbusClient;
  private syncEnabled: boolean;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('JOBNIMBUS_BASE_URL');
    const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');
    this.syncEnabled = this.configService.get<string>('JOBNIMBUS_SYNC_ENABLED') === 'true';

    if (!baseUrl || !apiKey) {
      this.logger.warn('JobNimbus API credentials not configured. Sync will be disabled.');
      this.syncEnabled = false;
    } else {
      this.jobNimbusClient = new JobNimbusClient({
        baseUrl,
        apiKey,
      });
      this.logger.log('JobNimbus client initialized');
    }
  }

  /**
   * Scheduled job sync - runs every 15 minutes (configurable)
   */
  @Cron(process.env.JOBNIMBUS_SYNC_CRON || '*/15 * * * *')
  async scheduledJobSync() {
    if (!this.syncEnabled) {
      return;
    }

    this.logger.log('Running scheduled JobNimbus sync');
    try {
      await this.syncJobsFromJobNimbus();
    } catch (error) {
      this.logger.error('Scheduled sync failed:', error);
    }
  }

  /**
   * Sync jobs from JobNimbus to local database
   */
  async syncJobsFromJobNimbus(): Promise<SyncSummary> {
    const startedAt = new Date();
    const errors: string[] = [];
    let jobsFetched = 0;
    let jobsUpserted = 0;
    let jobsUnchanged = 0;

    this.logger.log('[SyncService] Starting job sync from JobNimbus');

    try {
      // Fetch jobs from JobNimbus with pagination
      const allJobs = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        this.logger.log(`Fetching jobs page ${page}...`);

        const jobs = await this.jobNimbusClient.fetchJobs({
          limit,
          page,
        });

        allJobs.push(...jobs);
        jobsFetched += jobs.length;

        // If we got fewer results than the limit, we're done
        hasMore = jobs.length === limit;
        page++;
      }

      this.logger.log(`Fetched ${jobsFetched} jobs from JobNimbus`);

      // Process each job
      for (const jnJob of allJobs) {
        try {
          const jobData = transformJobNimbusJob(jnJob);

          const existing = await prisma.job.findUnique({
            where: { jobNimbusId: jnJob.jnid },
          });

          if (existing) {
            // Update existing job
            await prisma.job.update({
              where: { jobNimbusId: jnJob.jnid },
              data: jobData,
            });
            jobsUnchanged++;
          } else {
            // Create new job
            await prisma.job.create({
              data: {
                ...jobData,
                jobNimbusId: jnJob.jnid,
                customerName: jobData.customerName || '',
                address: jobData.address || '',
              },
            });
            jobsUpserted++;
          }
        } catch (error) {
          const errorMsg = `Failed to sync job ${jnJob.jnid}: ${error instanceof Error ? error.message : String(error)}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const finishedAt = new Date();
      this.logger.log(
        `Job sync completed: ${jobsUpserted} upserted, ${jobsUnchanged} unchanged, ${errors.length} errors`
      );

      return {
        success: errors.length === 0,
        jobsFetched,
        jobsUpserted,
        jobsUnchanged,
        contactsFetched: 0,
        contactsUpserted: 0,
        startedAt,
        finishedAt,
        errors,
      };
    } catch (error) {
      this.logger.error('Job sync failed:', error);

      if (error instanceof JobNimbusError) {
        errors.push(`JobNimbus API error: ${error.message}`);
      } else {
        errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      }

      return {
        success: false,
        jobsFetched,
        jobsUpserted,
        jobsUnchanged,
        contactsFetched: 0,
        contactsUpserted: 0,
        startedAt,
        finishedAt: new Date(),
        errors,
      };
    }
  }

  /**
   * Sync contacts from JobNimbus to local database
   */
  async syncContactsFromJobNimbus(): Promise<SyncSummary> {
    const startedAt = new Date();
    const errors: string[] = [];
    let contactsFetched = 0;
    let contactsUpserted = 0;

    this.logger.log('[SyncService] Starting contact sync from JobNimbus');

    try {
      // Fetch contacts from JobNimbus
      const allContacts = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        this.logger.log(`Fetching contacts page ${page}...`);

        const contacts = await this.jobNimbusClient.fetchContacts({
          limit,
          page,
        });

        allContacts.push(...contacts);
        contactsFetched += contacts.length;

        hasMore = contacts.length === limit;
        page++;
      }

      this.logger.log(`Fetched ${contactsFetched} contacts from JobNimbus`);

      // Process each contact
      for (const jnContact of allContacts) {
        try {
          const contactData = transformJobNimbusContact(jnContact);

          // Try to find a related job by JobNimbus ID
          const job = await prisma.job.findFirst({
            orderBy: { createdAt: 'desc' },
          });

          if (!job) {
            this.logger.warn(`No job found for contact ${jnContact.jnid}, skipping`);
            continue;
          }

          await prisma.contact.upsert({
            where: { jobNimbusId: jnContact.jnid },
            create: {
              ...contactData,
              jobNimbusId: jnContact.jnid,
              name: contactData.name || '',
              role: contactData.role || 'CUSTOMER',
              jobId: job.id,
            },
            update: contactData,
          });

          contactsUpserted++;
        } catch (error) {
          const errorMsg = `Failed to sync contact ${jnContact.jnid}: ${error instanceof Error ? error.message : String(error)}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const finishedAt = new Date();
      this.logger.log(
        `Contact sync completed: ${contactsUpserted} upserted, ${errors.length} errors`
      );

      return {
        success: errors.length === 0,
        jobsFetched: 0,
        jobsUpserted: 0,
        jobsUnchanged: 0,
        contactsFetched,
        contactsUpserted,
        startedAt,
        finishedAt,
        errors,
      };
    } catch (error) {
      this.logger.error('Contact sync failed:', error);

      if (error instanceof JobNimbusError) {
        errors.push(`JobNimbus API error: ${error.message}`);
      } else {
        errors.push(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      }

      return {
        success: false,
        jobsFetched: 0,
        jobsUpserted: 0,
        jobsUnchanged: 0,
        contactsFetched,
        contactsUpserted,
        startedAt,
        finishedAt: new Date(),
        errors,
      };
    }
  }

  /**
   * Get the most recent sync summary from logs
   */
  async getLastSyncSummary(): Promise<any> {
    const recentSync = await prisma.jobSyncLog.findFirst({
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (!recentSync) {
      return {
        message: 'No sync has been performed yet',
        lastSync: null,
      };
    }

    return {
      lastSync: recentSync,
      message: 'Last sync summary retrieved',
    };
  }

  /**
   * Health check for JobNimbus API
   */
  async checkJobNimbusHealth(): Promise<{ status: 'ok' | 'error'; message: string }> {
    if (!this.syncEnabled || !this.jobNimbusClient) {
      return {
        status: 'error',
        message: 'JobNimbus integration not configured',
      };
    }

    try {
      return await this.jobNimbusClient.healthCheck();
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Write a note back to JobNimbus
   * TODO: Implement in Phase 1 Sprint 3
   */
  async writeBackNoteToJobNimbus(
    jobId: string,
    note: { content: string; createdBy: string }
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[SyncService] writeBackNoteToJobNimbus called:', { jobId, note });

    // TODO: Implement:
    // 1. Get job's JobNimbus ID from database
    // 2. Call jobNimbusClient.createNote()
    // 3. Create JobSyncLog entry
    // 4. Handle errors

    return {
      success: false,
      error: 'Not implemented yet - to be completed in Phase 1 Sprint 3',
    };
  }

  /**
   * Write a task back to JobNimbus
   * TODO: Implement in Phase 1 Sprint 3
   */
  async writeBackTaskToJobNimbus(
    jobId: string,
    taskData: {
      title: string;
      description?: string;
      dueDate?: Date;
      assignedTo?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[SyncService] writeBackTaskToJobNimbus called:', { jobId, taskData });

    // TODO: Implement:
    // 1. Get job's JobNimbus ID from database
    // 2. Call jobNimbusClient.createTask()
    // 3. Create JobSyncLog entry
    // 4. Handle errors

    return {
      success: false,
      error: 'Not implemented yet - to be completed in Phase 1 Sprint 3',
    };
  }

  /**
   * Get sync logs for a specific job
   */
  async getSyncLogs(jobId: string) {
    return prisma.jobSyncLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
