import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { randomBytes } from 'crypto';
import type {
  PortalJobView,
  PortalJobPhoto,
  PortalJobDocument,
  PortalJobStatusStep,
  PortalPhotoCategory,
  PortalDocumentType,
} from '@greenenergy/shared-types';

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Create a magic link session for a customer to access their job
   */
  async createPortalSessionForJob(jobId: string, email: string): Promise<{ url: string }> {
    this.logger.log(`Creating portal session for job ${jobId}, email ${email}`);

    // Verify the job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Find or create customer user
    let customerUser = await prisma.customerUser.findFirst({
      where: { jobId, email },
    });

    if (!customerUser) {
      this.logger.log(`Creating new customer user for ${email}`);
      customerUser = await prisma.customerUser.create({
        data: {
          jobId,
          email,
          name: job.customerName,
        },
      });
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');

    // Calculate expiration (default 7 days)
    const sessionTtlDays = parseInt(
      this.configService.get<string>('PORTAL_SESSION_TTL_DAYS') || '7',
      10
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + sessionTtlDays);

    // Create portal session
    await prisma.portalSession.create({
      data: {
        token,
        customerUserId: customerUser.id,
        jobId,
        expiresAt,
      },
    });

    // Construct magic link URL
    const portalBaseUrl =
      this.configService.get<string>('PORTAL_BASE_URL') || 'http://localhost:3001';
    const url = `${portalBaseUrl}/auth/magic-link?token=${token}`;

    this.logger.log(`Portal session created successfully`);
    return { url };
  }

  /**
   * Validate a portal session token and return the job view
   */
  async resolvePortalSession(token: string): Promise<{ jobId: string; jobView: PortalJobView }> {
    this.logger.log(`Resolving portal session for token: ${token.substring(0, 8)}...`);

    // Find the portal session
    const session = await prisma.portalSession.findUnique({
      where: { token },
      include: {
        job: true,
        customerUser: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session token has expired');
    }

    // Mark as used on first access
    if (!session.usedAt) {
      await prisma.portalSession.update({
        where: { id: session.id },
        data: { usedAt: new Date() },
      });

      // Update customer user last login
      await prisma.customerUser.update({
        where: { id: session.customerUserId },
        data: { lastLoginAt: new Date() },
      });
    }

    // Build and return the job view
    const jobView = await this.buildPortalJobView(session.jobId);

    return {
      jobId: session.jobId,
      jobView,
    };
  }

  /**
   * Get portal job view for an authenticated session
   */
  async getPortalJobViewForSession(jobId: string, token: string): Promise<PortalJobView> {
    this.logger.log(`Fetching job view for jobId: ${jobId}`);

    // Validate the session and verify it's for this job
    const session = await prisma.portalSession.findUnique({
      where: { token },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (session.jobId !== jobId) {
      throw new UnauthorizedException('Session token is not valid for this job');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session token has expired');
    }

    // Build and return the job view
    return this.buildPortalJobView(jobId);
  }

  /**
   * Build portal job view for internal use (bypasses session token validation)
   */
  async buildInternalPortalJobView(jobId: string): Promise<PortalJobView> {
    return this.buildPortalJobView(jobId);
  }

  /**
   * Build a complete portal job view from database data
   */
  private async buildPortalJobView(jobId: string): Promise<PortalJobView> {
    // Load job with related data
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        photos: {
          orderBy: { uploadedAt: 'desc' },
        },
        warranties: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Build status timeline
    const statusTimeline = this.buildStatusTimeline(job.status);

    // Map photos
    const photos: PortalJobPhoto[] = job.photos.map((photo) => ({
      id: photo.id,
      category: this.mapPhotoCategory(photo.category),
      url: photo.fileUrl,
      caption: photo.fileName,
      takenAt: photo.uploadedAt.toISOString(),
    }));

    // Map documents
    const documents: PortalJobDocument[] = [];

    // Add warranty documents
    for (const warranty of job.warranties) {
      documents.push({
        id: warranty.id,
        type: 'WARRANTY',
        name: `${warranty.warrantyType} Warranty - ${warranty.provider}`,
        url: '#', // Placeholder - would need actual document storage
        uploadedAt: warranty.createdAt.toISOString(),
      });
    }

    return {
      jobId: job.id,
      jobNumber: job.jobNimbusId || job.id.substring(0, 8).toUpperCase(),
      customerName: job.customerName,
      propertyAddress: job.address,
      currentStatus: this.formatStatus(job.status),
      statusTimeline,
      lastUpdatedAt: job.updatedAt.toISOString(),
      photos,
      documents,
    };
  }

  /**
   * Build a standardized status timeline based on current job status
   */
  private buildStatusTimeline(currentStatus: string): PortalJobStatusStep[] {
    const steps: Array<{
      label: string;
      description: string;
      statusKey: string;
    }> = [
      {
        label: 'Contract Signed',
        description: 'Your solar installation contract has been signed',
        statusKey: 'LEAD',
      },
      {
        label: 'Site Survey',
        description: 'Our team assesses your property',
        statusKey: 'SITE_SURVEY',
      },
      {
        label: 'Design Complete',
        description: 'Custom system design for your home',
        statusKey: 'DESIGN',
      },
      {
        label: 'Permit Submitted',
        description: 'Permits filed with local authorities',
        statusKey: 'PERMITTING',
      },
      {
        label: 'Permit Approved',
        description: 'All permits approved for installation',
        statusKey: 'APPROVED',
      },
      {
        label: 'Installation Scheduled',
        description: 'Installation date confirmed',
        statusKey: 'SCHEDULED',
      },
      {
        label: 'Installation In Progress',
        description: 'Your solar system is being installed',
        statusKey: 'IN_PROGRESS',
      },
      {
        label: 'Final Inspection',
        description: 'System inspection and approval',
        statusKey: 'INSPECTION',
      },
      {
        label: 'Job Complete',
        description: 'Your solar system is operational!',
        statusKey: 'COMPLETE',
      },
    ];

    // Map status keys to order
    const statusOrder: Record<string, number> = {
      LEAD: 0,
      QUALIFIED: 0,
      SITE_SURVEY: 1,
      DESIGN: 2,
      PERMITTING: 3,
      APPROVED: 4,
      SCHEDULED: 5,
      IN_PROGRESS: 6,
      INSPECTION: 7,
      COMPLETE: 8,
      CANCELLED: -1,
    };

    const currentOrder = statusOrder[currentStatus] ?? 0;

    return steps.map((step, index) => ({
      id: `step-${index}`,
      label: step.label,
      description: step.description,
      order: index,
      status:
        index < currentOrder ? 'COMPLETED' : index === currentOrder ? 'IN_PROGRESS' : 'PENDING',
      completedAt: index < currentOrder ? new Date().toISOString() : undefined,
    }));
  }

  /**
   * Map photo category from database to portal format
   */
  private mapPhotoCategory(category: string | null): PortalPhotoCategory {
    if (!category) return 'DURING';

    const upperCategory = category.toUpperCase();
    if (upperCategory.includes('BEFORE')) return 'BEFORE';
    if (upperCategory.includes('AFTER')) return 'AFTER';
    return 'DURING';
  }

  /**
   * Format status for display
   */
  private formatStatus(status: string): string {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
