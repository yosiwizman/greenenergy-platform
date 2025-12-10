import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';
import type {
  PhotoCategory,
  QCRuleRequirement,
  QCCheckResult,
  QCMissingCategory,
  QCCheckStatus,
  JobQCOverview,
} from '@greenenergy/shared-types';

// Phase 1: Static QC rules - 5 photos per category
const DEFAULT_QC_RULES: QCRuleRequirement[] = [
  { category: 'BEFORE', requiredCount: 5 },
  { category: 'DURING', requiredCount: 5 },
  { category: 'AFTER', requiredCount: 5 },
];

@Injectable()
export class QCService {
  private readonly logger = new Logger(QCService.name);
  private jobNimbusClient!: JobNimbusClient;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('JOBNIMBUS_BASE_URL');
    const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');

    if (baseUrl && apiKey) {
      this.jobNimbusClient = new JobNimbusClient({ baseUrl, apiKey });
    }
  }

  /**
   * Evaluate QC for a specific job based on photo count rules
   */
  async evaluateJobQC(jobId: string): Promise<QCCheckResult> {
    this.logger.log(`Evaluating QC for job: ${jobId}`);

    // Get all photos for the job
    const photos = await prisma.photoMetadata.findMany({
      where: { jobId },
      select: { category: true },
    });

    // Count photos by category
    const counts: Record<PhotoCategory, number> = {
      BEFORE: 0,
      DURING: 0,
      AFTER: 0,
    };

    for (const photo of photos) {
      if (photo.category && photo.category in counts) {
        counts[photo.category as PhotoCategory]++;
      }
    }

    // Check against rules
    const missingCategories: QCMissingCategory[] = [];
    let hasFailures = false;

    for (const rule of DEFAULT_QC_RULES) {
      const actualCount = counts[rule.category];
      if (actualCount < rule.requiredCount) {
        hasFailures = true;
        missingCategories.push({
          category: rule.category,
          requiredCount: rule.requiredCount,
          actualCount,
        });
      }
    }

    const status: QCCheckStatus = hasFailures ? 'FAIL' : 'PASS';
    const checkedAt = new Date();

    // Store result in database
    await prisma.qCPhotoCheck.create({
      data: {
        jobId,
        status,
        checkedAt,
        missingCategoriesJson: JSON.stringify(missingCategories),
        totalPhotosJson: JSON.stringify(counts),
      },
    });

    // If QC failed, write back to JobNimbus
    if (status === 'FAIL') {
      await this.writeBackQCFailureToJobNimbus(jobId, missingCategories, counts);
    }

    const result: QCCheckResult = {
      jobId,
      status,
      checkedAt: checkedAt.toISOString(),
      missingCategories,
      totalPhotosByCategory: counts,
    };

    this.logger.log(`QC evaluation complete for job ${jobId}: ${status}`);
    return result;
  }

  /**
   * Write QC failure back to JobNimbus as a note and task
   */
  private async writeBackQCFailureToJobNimbus(
    jobId: string,
    missingCategories: QCMissingCategory[],
    counts: Record<PhotoCategory, number>
  ): Promise<void> {
    if (!this.jobNimbusClient) {
      this.logger.warn('JobNimbus client not configured, skipping write-back');
      return;
    }

    try {
      // Get job's JobNimbus ID
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job || !job.jobNimbusId) {
        this.logger.warn(`Job ${jobId} has no JobNimbus ID, skipping write-back`);
        return;
      }

      // Compose human-readable note
      const missingDetails = missingCategories
        .map((m) => `${m.category}: ${m.actualCount}/${m.requiredCount}`)
        .join(', ');

      const noteText = `🚨 QC FAILED: Missing required photos\n\nCurrent photo counts:\n- BEFORE: ${counts.BEFORE}/5\n- DURING: ${counts.DURING}/5\n- AFTER: ${counts.AFTER}/5\n\nMissing: ${missingDetails}\n\nPlease upload the missing photos to proceed.`;

      // Create note in JobNimbus
      await this.jobNimbusClient.createNote(job.jobNimbusId, {
        text: noteText,
        createdBy: 'QC System',
      });

      // Create task for uploading missing photos
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

      await this.jobNimbusClient.createTask(job.jobNimbusId, {
        title: 'Upload missing QC photos',
        dueDate: dueDate.toISOString(),
      });

      // Update QCPhotoCheck to mark as synced
      await prisma.qCPhotoCheck.updateMany({
        where: {
          jobId,
          jobNimbusSyncedAt: null,
        },
        data: {
          jobNimbusSyncedAt: new Date(),
        },
      });

      this.logger.log(`QC failure written back to JobNimbus for job ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to write QC failure to JobNimbus for job ${jobId}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Don't throw - QC evaluation succeeded even if write-back failed
    }
  }

  /**
   * Evaluate QC for all jobs
   */
  async evaluateAllJobsQC(): Promise<{ totalJobs: number; evaluated: number; errors: string[] }> {
    this.logger.log('Evaluating QC for all jobs');

    const jobs = await prisma.job.findMany({
      where: { jobNimbusId: { not: null } },
      select: { id: true, customerName: true },
    });

    const summary = {
      totalJobs: jobs.length,
      evaluated: 0,
      errors: [] as string[],
    };

    for (const job of jobs) {
      try {
        await this.evaluateJobQC(job.id);
        summary.evaluated++;
      } catch (error) {
        const errorMsg = `Failed to evaluate QC for job ${job.id}: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }

    this.logger.log(
      `QC evaluation summary: ${summary.evaluated}/${summary.totalJobs} jobs evaluated`
    );
    return summary;
  }

  /**
   * Get latest QC result for a job
   */
  async getLatestQCResult(jobId: string): Promise<QCCheckResult | null> {
    const qcCheck = await prisma.qCPhotoCheck.findFirst({
      where: { jobId },
      orderBy: { checkedAt: 'desc' },
    });

    if (!qcCheck) {
      return null;
    }

    return {
      jobId: qcCheck.jobId,
      status: qcCheck.status as QCCheckStatus,
      checkedAt: qcCheck.checkedAt.toISOString(),
      missingCategories: JSON.parse(qcCheck.missingCategoriesJson),
      totalPhotosByCategory: JSON.parse(qcCheck.totalPhotosJson),
      jobNimbusSyncedAt: qcCheck.jobNimbusSyncedAt
        ? qcCheck.jobNimbusSyncedAt.toISOString()
        : undefined,
    };
  }

  /**
   * Get QC overview for all jobs
   */
  async getQCOverview(): Promise<JobQCOverview[]> {
    // Get latest QC check for each job
    const jobs = await prisma.job.findMany({
      select: {
        id: true,
        jobNimbusId: true,
        customerName: true,
        qcPhotoChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        photos: {
          select: { category: true },
        },
      },
    });

    return jobs.map((job: { id: string; jobNimbusId: string | null; customerName: string | null; qcPhotoChecks: Array<{ status: string; checkedAt: Date }>; photos: Array<{ category: string | null }> }) => {
      const latestCheck = job.qcPhotoChecks[0];
      const photoCounts = job.photos.reduce(
        (acc: Record<PhotoCategory, number>, p: { category: string | null }) => {
          if (
            p.category &&
            (p.category === 'BEFORE' || p.category === 'DURING' || p.category === 'AFTER')
          ) {
            acc[p.category as PhotoCategory]++;
          }
          return acc;
        },
        { BEFORE: 0, DURING: 0, AFTER: 0 } as Record<PhotoCategory, number>
      );

      return {
        jobId: job.id,
        jobName: job.customerName || 'Unknown',
        qcStatus: latestCheck ? (latestCheck.status as QCCheckStatus) : 'NOT_CHECKED',
        totalPhotos: photoCounts.BEFORE + photoCounts.DURING + photoCounts.AFTER,
        beforeCount: photoCounts.BEFORE,
        duringCount: photoCounts.DURING,
        afterCount: photoCounts.AFTER,
        lastCheckedAt: latestCheck ? latestCheck.checkedAt.toISOString() : undefined,
      };
    });
  }
}
