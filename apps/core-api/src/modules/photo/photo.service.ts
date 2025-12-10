import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient, JobNimbusPhoto } from '@greenenergy/jobnimbus-sdk';
import type { PhotoCategory, SyncPhotosSummary } from '@greenenergy/shared-types';

@Injectable()
export class PhotoService {
  private readonly logger = new Logger(PhotoService.name);
  private jobNimbusClient!: JobNimbusClient;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('JOBNIMBUS_BASE_URL');
    const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');

    if (baseUrl && apiKey) {
      this.jobNimbusClient = new JobNimbusClient({ baseUrl, apiKey });
    }
  }

  /**
   * Classify a photo into BEFORE/DURING/AFTER based on filename, tags, and folder
   * Phase 1 heuristic - can be enhanced later with ML
   */
  classifyPhoto(photo: JobNimbusPhoto): PhotoCategory {
    const filename = (photo.filename || '').toLowerCase();
    const folder = (photo.folderName || '').toLowerCase();
    const tags = (photo.tags || []).map((t) => t.toLowerCase());

    // Check tags first (most explicit)
    if (tags.some((tag) => tag.includes('before'))) return 'BEFORE';
    if (tags.some((tag) => tag.includes('after'))) return 'AFTER';
    if (tags.some((tag) => tag.includes('during') || tag.includes('progress'))) return 'DURING';

    // Check folder name
    if (folder.includes('before')) return 'BEFORE';
    if (folder.includes('after') || folder.includes('complete')) return 'AFTER';
    if (folder.includes('during') || folder.includes('progress') || folder.includes('install'))
      return 'DURING';

    // Check filename patterns
    if (filename.includes('before')) return 'BEFORE';
    if (filename.includes('after') || filename.includes('final') || filename.includes('complete'))
      return 'AFTER';
    if (
      filename.includes('during') ||
      filename.includes('progress') ||
      filename.includes('install') ||
      filename.includes('wip')
    )
      return 'DURING';

    // Default to DURING if no clear indicator
    this.logger.debug(`No clear category for photo ${photo.filename}, defaulting to DURING`);
    return 'DURING';
  }

  /**
   * Sync photos for a specific job from JobNimbus
   */
  async syncPhotosForJob(
    jobId: string
  ): Promise<{ inserted: number; updated: number; unchanged: number }> {
    this.logger.log(`Syncing photos for job: ${jobId}`);

    if (!this.jobNimbusClient) {
      throw new Error('JobNimbus client not configured');
    }

    // Get the job to find its JobNimbus ID
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) {
      throw new Error(`Job ${jobId} not found or has no JobNimbus ID`);
    }

    // Fetch photos from JobNimbus
    const jnPhotos = await this.jobNimbusClient.fetchJobPhotos(job.jobNimbusId);

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const jnPhoto of jnPhotos) {
      // Classify the photo
      const category = this.classifyPhoto(jnPhoto);

      // Check if photo already exists
      const existing = await prisma.photoMetadata.findUnique({
        where: { jobNimbusAttachmentId: jnPhoto.id },
      });

      if (existing) {
        // Update if category or URL changed
        if (existing.category !== category || existing.fileUrl !== jnPhoto.url) {
          await prisma.photoMetadata.update({
            where: { id: existing.id },
            data: {
              category,
              fileUrl: jnPhoto.url,
              fileName: jnPhoto.filename || existing.fileName,
            },
          });
          updated++;
        } else {
          unchanged++;
        }
      } else {
        // Insert new photo
        await prisma.photoMetadata.create({
          data: {
            jobId,
            jobNimbusAttachmentId: jnPhoto.id,
            fileName: jnPhoto.filename || `photo-${jnPhoto.id}`,
            fileUrl: jnPhoto.url,
            uploadedBy: 'JobNimbus',
            uploadedAt: jnPhoto.uploadedAt ? new Date(jnPhoto.uploadedAt) : new Date(),
            category,
            source: 'JOBNIMBUS',
          },
        });
        inserted++;
      }
    }

    this.logger.log(
      `Photo sync complete for job ${jobId}: ${inserted} inserted, ${updated} updated, ${unchanged} unchanged`
    );

    return { inserted, updated, unchanged };
  }

  /**
   * Sync photos for all jobs or a batch of jobs
   */
  async syncPhotosForAllJobs(limit?: number): Promise<SyncPhotosSummary> {
    this.logger.log(`Starting photo sync for all jobs (limit: ${limit || 'none'})`);

    const jobs = await prisma.job.findMany({
      where: {
        jobNimbusId: { not: null },
      },
      take: limit,
      select: { id: true, jobNimbusId: true, customerName: true },
    });

    const summary: SyncPhotosSummary = {
      totalJobs: jobs.length,
      photosInserted: 0,
      photosUpdated: 0,
      photosUnchanged: 0,
      errors: [],
    };

    for (const job of jobs) {
      try {
        const result = await this.syncPhotosForJob(job.id);
        summary.photosInserted += result.inserted;
        summary.photosUpdated += result.updated;
        summary.photosUnchanged += result.unchanged;
      } catch (error) {
        const errorMsg = `Failed to sync photos for job ${job.id} (${job.customerName}): ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }

    this.logger.log(
      `Photo sync summary: ${summary.totalJobs} jobs, ${summary.photosInserted} photos inserted, ${summary.photosUpdated} updated, ${summary.errors.length} errors`
    );

    return summary;
  }

  /**
   * Get photos for a job, grouped by category
   */
  async getPhotosForJob(jobId: string) {
    const photos = await prisma.photoMetadata.findMany({
      where: { jobId },
      orderBy: { uploadedAt: 'desc' },
    });

    const grouped = {
      BEFORE: photos.filter((p) => p.category === 'BEFORE'),
      DURING: photos.filter((p) => p.category === 'DURING'),
      AFTER: photos.filter((p) => p.category === 'AFTER'),
    };

    return {
      all: photos,
      byCategory: grouped,
      counts: {
        BEFORE: grouped.BEFORE.length,
        DURING: grouped.DURING.length,
        AFTER: grouped.AFTER.length,
        total: photos.length,
      },
    };
  }
}
