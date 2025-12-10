import { Controller, Get, Post, HttpCode, HttpStatus, Logger, Param, Query } from '@nestjs/common';
import { SyncService, SyncSummary } from './sync.service';
import { PhotoService } from '../photo/photo.service';
import { SyncPhotosSummary } from '@greenenergy/shared-types';

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly photoService: PhotoService
  ) {}

  /**
   * Manually trigger job sync from JobNimbus
   * POST /api/v1/sync/jobs
   */
  @Post('jobs')
  @HttpCode(HttpStatus.OK)
  async syncJobs(): Promise<SyncSummary> {
    this.logger.log('Manual job sync triggered');
    return await this.syncService.syncJobsFromJobNimbus();
  }

  /**
   * Manually trigger contact sync from JobNimbus
   * POST /api/v1/sync/contacts
   */
  @Post('contacts')
  @HttpCode(HttpStatus.OK)
  async syncContacts(): Promise<SyncSummary> {
    this.logger.log('Manual contact sync triggered');
    return await this.syncService.syncContactsFromJobNimbus();
  }

  /**
   * Get last sync summary
   * GET /api/v1/sync/summary
   */
  @Get('summary')
  async getSyncSummary() {
    return await this.syncService.getLastSyncSummary();
  }

  /**
   * Get sync logs for a specific job
   * This could be extended with query params for jobId
   * GET /api/v1/sync/logs
   */
  @Get('logs')
  async getSyncLogs() {
    return {
      message: 'Sync logs endpoint - add ?jobId=xxx query param for specific job logs',
      note: 'Full implementation in future sprint',
    };
  }

  /**
   * Manually trigger photo sync for a specific job or all jobs
   * POST /api/v1/sync/photos
   * POST /api/v1/sync/photos?jobId=xxx
   * POST /api/v1/sync/photos?limit=10
   */
  @Post('photos')
  @HttpCode(HttpStatus.OK)
  async syncPhotos(
    @Query('jobId') jobId?: string,
    @Query('limit') limit?: string
  ): Promise<SyncPhotosSummary> {
    if (jobId) {
      this.logger.log(`Manual photo sync triggered for jobId=${jobId}`);
      const result = await this.photoService.syncPhotosForJob(jobId);
      return {
        totalJobs: 1,
        photosInserted: result.inserted,
        photosUpdated: result.updated,
        photosUnchanged: result.unchanged,
        errors: [],
      };
    } else {
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      this.logger.log(
        limitNum
          ? `Manual photo sync triggered for up to ${limitNum} jobs`
          : 'Manual photo sync triggered for all jobs'
      );
      return await this.photoService.syncPhotosForAllJobs(limitNum);
    }
  }
}
