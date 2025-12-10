import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';
import type {
  WarrantyDTO,
  WarrantyStatus,
  WarrantyClaimDTO,
  WarrantyClaimStatus,
  WarrantyClaimPriority,
  WarrantySummaryDTO,
} from '@greenenergy/shared-types';

@Injectable()
export class WarrantyService {
  private readonly logger = new Logger(WarrantyService.name);
  private jobNimbusClient: JobNimbusClient | null = null;
  private readonly expiryNoticeDays: number;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('JOBNIMBUS_BASE_URL');
    const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');

    if (baseUrl && apiKey) {
      this.jobNimbusClient = new JobNimbusClient({ baseUrl, apiKey });
      this.logger.log('JobNimbus client initialized for warranty notifications');
    } else {
      this.logger.warn('JobNimbus credentials not configured - warranty notifications disabled');
    }

    this.expiryNoticeDays = this.configService.get<number>('WARRANTY_EXPIRY_NOTICE_DAYS') || 30;
  }

  /**
   * Activate or update warranty for a job
   */
  async activateWarrantyForJob(
    jobId: string,
    input: {
      type: string;
      provider?: string;
      termMonths?: number;
      coverageJson?: unknown;
      warrantyNumber?: string;
      documentUrl?: string;
    },
  ): Promise<WarrantyDTO> {
    this.logger.log(`Activating warranty for job: ${jobId}`);

    // Fetch job to get completion date
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Determine start date: prefer job completion date, else now
    const startDate = job.completionDate || new Date();
    
    // Calculate end date based on term (default 120 months = 10 years)
    const termMonths = input.termMonths || 120;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + termMonths);

    const activatedAt = new Date();

    // Upsert warranty (update if exists, create if not)
    const warranty = await prisma.warranty.upsert({
      where: { jobId },
      create: {
        jobId,
        type: input.type,
        provider: input.provider,
        warrantyNumber: input.warrantyNumber,
        startDate,
        endDate,
        status: 'ACTIVE',
        coverageJson: input.coverageJson as any,
        documentUrl: input.documentUrl,
        activatedAt,
      },
      update: {
        type: input.type,
        provider: input.provider,
        warrantyNumber: input.warrantyNumber,
        startDate,
        endDate,
        status: 'ACTIVE',
        coverageJson: input.coverageJson as any,
        documentUrl: input.documentUrl,
        activatedAt,
      },
    });

    // Add JobNimbus note if client is available
    if (this.jobNimbusClient && job.jobNimbusId) {
      try {
        const formattedEndDate = endDate.toLocaleDateString();
        await this.jobNimbusClient.createNote(job.jobNimbusId, {
          text: `✅ Warranty activated: Type ${input.type}, Provider: ${input.provider || 'N/A'}, Valid until: ${formattedEndDate}`,
        });
        this.logger.log(`JobNimbus note created for warranty activation on job ${jobId}`);
      } catch (error) {
        this.logger.error(
          `Failed to create JobNimbus note for warranty: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return this.mapWarrantyToDTO(warranty);
  }

  /**
   * Get warranty for a specific job
   */
  async getWarrantyForJob(jobId: string): Promise<WarrantyDTO | null> {
    const warranty = await prisma.warranty.findUnique({
      where: { jobId },
    });

    return warranty ? this.mapWarrantyToDTO(warranty) : null;
  }

  /**
   * List warranties with optional filters
   */
  async listWarranties(filters: {
    status?: WarrantyStatus;
    fromEndDate?: string;
    toEndDate?: string;
  }): Promise<WarrantyDTO[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromEndDate || filters.toEndDate) {
      where.endDate = {};
      if (filters.fromEndDate) {
        where.endDate.gte = new Date(filters.fromEndDate);
      }
      if (filters.toEndDate) {
        where.endDate.lte = new Date(filters.toEndDate);
      }
    }

    const warranties = await prisma.warranty.findMany({
      where,
      orderBy: { endDate: 'asc' },
    });

    return warranties.map((w: any) => this.mapWarrantyToDTO(w));
  }

  /**
   * Get warranty summary statistics
   */
  async getWarrantySummary(): Promise<WarrantySummaryDTO> {
    const now = new Date();
    const expiryThreshold = new Date(now);
    expiryThreshold.setDate(expiryThreshold.getDate() + this.expiryNoticeDays);

    const [total, active, expiringSoon, expired] = await Promise.all([
      prisma.warranty.count(),
      prisma.warranty.count({ where: { status: 'ACTIVE' } }),
      prisma.warranty.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: now,
            lte: expiryThreshold,
          },
        },
      }),
      prisma.warranty.count({
        where: {
          endDate: { lt: now },
        },
      }),
    ]);

    return {
      total,
      active,
      expiringSoon,
      expired,
    };
  }

  /**
   * Find warranties expiring soon
   */
  async findWarrantiesExpiringSoon(daysBefore: number): Promise<WarrantyDTO[]> {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + daysBefore);

    const warranties = await prisma.warranty.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: threshold,
        },
      },
      include: {
        job: {
          select: {
            id: true,
            jobNimbusId: true,
            customerName: true,
          },
        },
      },
    });

    return warranties.map((w: any) => this.mapWarrantyToDTO(w));
  }

  /**
   * Process expiring warranties - add notes/tasks to JobNimbus
   */
  async processExpiringWarranties(daysBefore: number): Promise<void> {
    this.logger.log(`Processing warranties expiring in ${daysBefore} days`);

    if (!this.jobNimbusClient) {
      this.logger.warn('JobNimbus client not configured, skipping expiry notifications');
      return;
    }

    const expiringWarranties = await prisma.warranty.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + daysBefore * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        job: {
          select: {
            id: true,
            jobNimbusId: true,
            customerName: true,
          },
        },
      },
    });

    this.logger.log(`Found ${expiringWarranties.length} expiring warranties`);

    for (const warranty of expiringWarranties) {
      if (!warranty.job.jobNimbusId) {
        this.logger.warn(`Job ${warranty.jobId} has no JobNimbus ID, skipping`);
        continue;
      }

      try {
        const daysUntilExpiry = Math.ceil(
          (warranty.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        );

        // Create note
        await this.jobNimbusClient.createNote(warranty.job.jobNimbusId, {
          text: `⚠️ WARRANTY EXPIRING: ${warranty.type} warranty expires in ${daysUntilExpiry} days (${warranty.endDate.toLocaleDateString()}). Customer: ${warranty.job.customerName}`,
        });

        // Create task
        const taskDueDate = new Date(warranty.endDate);
        taskDueDate.setDate(taskDueDate.getDate() - 7); // Due 7 days before expiry

        await this.jobNimbusClient.createTask(warranty.job.jobNimbusId, {
          title: `Follow up on expiring ${warranty.type} warranty`,
          dueDate: taskDueDate.toISOString(),
        });

        this.logger.log(`Created expiry notification for warranty ${warranty.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to create expiry notification for warranty ${warranty.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Create warranty claim from internal source
   */
  async createClaimInternal(input: {
    jobId: string;
    warrantyId?: string;
    title: string;
    description: string;
    priority: WarrantyClaimPriority;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }): Promise<WarrantyClaimDTO> {
    this.logger.log(`Creating internal warranty claim for job: ${input.jobId}`);

    const job = await prisma.job.findUnique({ where: { id: input.jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${input.jobId} not found`);
    }

    const claim = await prisma.warrantyClaim.create({
      data: {
        jobId: input.jobId,
        warrantyId: input.warrantyId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        source: 'INTERNAL',
        status: 'OPEN',
      },
    });

    // Add JobNimbus note
    if (this.jobNimbusClient && job.jobNimbusId) {
      try {
        await this.jobNimbusClient.createNote(job.jobNimbusId, {
          text: `🔧 WARRANTY CLAIM (Internal): ${input.title}\nPriority: ${input.priority}\nDescription: ${input.description.substring(0, 200)}${input.description.length > 200 ? '...' : ''}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to create JobNimbus note for claim: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return this.mapClaimToDTO(claim);
  }

  /**
   * Create warranty claim from customer portal
   */
  async createClaimFromPortal(
    portalSession: { customerUserId: string; jobId: string },
    input: { title: string; description: string },
  ): Promise<WarrantyClaimDTO> {
    this.logger.log(`Creating portal warranty claim for job: ${portalSession.jobId}`);

    // Get customer user info
    const customerUser = await prisma.customerUser.findUnique({
      where: { id: portalSession.customerUserId },
    });

    if (!customerUser) {
      throw new NotFoundException('Customer user not found');
    }

    const job = await prisma.job.findUnique({ where: { id: portalSession.jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${portalSession.jobId} not found`);
    }

    // Try to find associated warranty
    const warranty = await prisma.warranty.findUnique({
      where: { jobId: portalSession.jobId },
    });

    const claim = await prisma.warrantyClaim.create({
      data: {
        jobId: portalSession.jobId,
        warrantyId: warranty?.id,
        title: input.title,
        description: input.description,
        priority: 'MEDIUM', // Default portal claims to MEDIUM
        customerName: customerUser.name,
        customerEmail: customerUser.email,
        source: 'PORTAL',
        status: 'OPEN',
      },
    });

    // Add JobNimbus note
    if (this.jobNimbusClient && job.jobNimbusId) {
      try {
        await this.jobNimbusClient.createNote(job.jobNimbusId, {
          text: `🔧 WARRANTY CLAIM (Portal): ${input.title}\nCustomer: ${customerUser.name} (${customerUser.email})\nDescription: ${input.description.substring(0, 200)}${input.description.length > 200 ? '...' : ''}`,
        });

        // Create task for portal claims
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await this.jobNimbusClient.createTask(job.jobNimbusId, {
          title: `Review portal warranty claim: ${input.title}`,
          dueDate: tomorrow.toISOString(),
        });
      } catch (error) {
        this.logger.error(
          `Failed to create JobNimbus notification for portal claim: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return this.mapClaimToDTO(claim);
  }

  /**
   * List warranty claims with filters
   */
  async listClaims(filters: {
    status?: WarrantyClaimStatus;
    jobId?: string;
  }): Promise<WarrantyClaimDTO[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.jobId) {
      where.jobId = filters.jobId;
    }

    const claims = await prisma.warrantyClaim.findMany({
      where,
      orderBy: { reportedAt: 'desc' },
    });

    return claims.map((c: any) => this.mapClaimToDTO(c));
  }

  /**
   * Get claim by ID
   */
  async getClaimById(id: string): Promise<WarrantyClaimDTO> {
    const claim = await prisma.warrantyClaim.findUnique({
      where: { id },
    });

    if (!claim) {
      throw new NotFoundException(`Warranty claim with ID ${id} not found`);
    }

    return this.mapClaimToDTO(claim);
  }

  /**
   * Update claim status
   */
  async updateClaimStatus(id: string, status: WarrantyClaimStatus): Promise<WarrantyClaimDTO> {
    this.logger.log(`Updating claim ${id} status to ${status}`);

    const updateData: any = { status };

    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const claim = await prisma.warrantyClaim.update({
      where: { id },
      data: updateData,
    });

    return this.mapClaimToDTO(claim);
  }

  /**
   * Map Prisma Warranty model to DTO
   */
  private mapWarrantyToDTO(warranty: any): WarrantyDTO {
    let coverageSummary: string | undefined;
    if (warranty.coverageJson) {
      try {
        const coverage = JSON.parse(JSON.stringify(warranty.coverageJson));
        coverageSummary = coverage.summary || JSON.stringify(coverage);
      } catch {
        coverageSummary = undefined;
      }
    }

    return {
      id: warranty.id,
      jobId: warranty.jobId,
      warrantyNumber: warranty.warrantyNumber || undefined,
      type: warranty.type,
      provider: warranty.provider || undefined,
      startDate: warranty.startDate.toISOString(),
      endDate: warranty.endDate.toISOString(),
      status: warranty.status as WarrantyStatus,
      coverageSummary,
      documentUrl: warranty.documentUrl || undefined,
      activatedAt: warranty.activatedAt?.toISOString(),
    };
  }

  /**
   * Map Prisma WarrantyClaim model to DTO
   */
  private mapClaimToDTO(claim: any): WarrantyClaimDTO {
    return {
      id: claim.id,
      jobId: claim.jobId,
      warrantyId: claim.warrantyId || undefined,
      customerName: claim.customerName || undefined,
      customerEmail: claim.customerEmail || undefined,
      customerPhone: claim.customerPhone || undefined,
      source: claim.source as 'PORTAL' | 'INTERNAL',
      status: claim.status as WarrantyClaimStatus,
      priority: claim.priority as WarrantyClaimPriority,
      title: claim.title,
      description: claim.description,
      reportedAt: claim.reportedAt.toISOString(),
      resolvedAt: claim.resolvedAt?.toISOString(),
    };
  }
}
