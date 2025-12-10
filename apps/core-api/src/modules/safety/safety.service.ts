import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';
import type {
  SafetyIncidentDTO,
  CreateSafetyIncidentDto,
  SafetyChecklistDTO,
  CreateSafetyChecklistDto,
  SafetyIncidentSummaryDTO,
  OshalogSummaryDTO,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
  SafetyChecklistType,
  SafetyIncidentType,
} from '@greenenergy/shared-types';

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);
  private jobNimbusClient: JobNimbusClient | null = null;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('JOBNIMBUS_BASE_URL');
    const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');

    if (baseUrl && apiKey) {
      this.jobNimbusClient = new JobNimbusClient({ baseUrl, apiKey });
      this.logger.log('JobNimbus client initialized for safety notifications');
    } else {
      this.logger.warn('JobNimbus credentials not configured - safety notifications disabled');
    }
  }

  /**
   * Create a safety incident
   */
  async createIncident(input: CreateSafetyIncidentDto): Promise<SafetyIncidentDTO> {
    this.logger.log(`Creating safety incident: type=${input.type}, severity=${input.severity}`);

    // Create incident with photos
    const incident = await prisma.safetyIncident.create({
      data: {
        jobId: input.jobId,
        subcontractorId: input.subcontractorId,
        type: input.type,
        severity: input.severity,
        description: input.description,
        occurredAt: new Date(input.occurredAt),
        reportedBy: input.reportedBy,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        status: input.status || 'OPEN',
        lostTimeDays: input.lostTimeDays,
        medicalTreatmentRequired: input.medicalTreatmentRequired,
        photos: input.photos
          ? {
              create: input.photos.map((photo) => ({
                url: photo.url,
                caption: photo.caption,
              })),
            }
          : undefined,
      },
      include: {
        photos: true,
        job: true,
        subcontractor: true,
      },
    });

    // JobNimbus integration for MEDIUM+ severity
    if (input.jobId && ['MEDIUM', 'HIGH', 'CRITICAL'].includes(input.severity)) {
      await this.notifyJobNimbusOfIncident(incident);
    }

    return this.mapIncidentToDTO(incident);
  }

  /**
   * Get incident by ID
   */
  async getIncidentById(id: string): Promise<SafetyIncidentDTO> {
    const incident = await prisma.safetyIncident.findUnique({
      where: { id },
      include: {
        photos: true,
        job: true,
        subcontractor: true,
      },
    });

    if (!incident) {
      throw new NotFoundException(`Safety incident with ID ${id} not found`);
    }

    return this.mapIncidentToDTO(incident);
  }

  /**
   * List incidents with filters
   */
  async listIncidents(filters: {
    jobId?: string;
    subcontractorId?: string;
    severity?: SafetyIncidentSeverity;
    status?: SafetyIncidentStatus;
    fromDate?: string;
    toDate?: string;
  }): Promise<SafetyIncidentDTO[]> {
    const where: any = {};

    if (filters.jobId) {
      where.jobId = filters.jobId;
    }

    if (filters.subcontractorId) {
      where.subcontractorId = filters.subcontractorId;
    }

    if (filters.severity) {
      where.severity = filters.severity;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.occurredAt = {};
      if (filters.fromDate) {
        where.occurredAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.occurredAt.lte = new Date(filters.toDate);
      }
    }

    const incidents = await prisma.safetyIncident.findMany({
      where,
      include: {
        photos: true,
        job: true,
        subcontractor: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    return incidents.map((incident: any) => this.mapIncidentToDTO(incident));
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(id: string, status: SafetyIncidentStatus): Promise<SafetyIncidentDTO> {
    this.logger.log(`Updating incident ${id} status to ${status}`);

    const incident = await prisma.safetyIncident.update({
      where: { id },
      data: { status },
      include: {
        photos: true,
        job: true,
        subcontractor: true,
      },
    });

    return this.mapIncidentToDTO(incident);
  }

  /**
   * Get incident summary
   */
  async getIncidentSummary(params: {
    fromDate?: string;
    toDate?: string;
  }): Promise<SafetyIncidentSummaryDTO> {
    const where: any = {};

    if (params.fromDate || params.toDate) {
      where.occurredAt = {};
      if (params.fromDate) {
        where.occurredAt.gte = new Date(params.fromDate);
      }
      if (params.toDate) {
        where.occurredAt.lte = new Date(params.toDate);
      }
    }

    const incidents = await prisma.safetyIncident.findMany({ where });

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const incidentsLast30Days = await prisma.safetyIncident.count({
      where: {
        occurredAt: { gte: thirtyDaysAgo },
      },
    });

    // Aggregate by type, severity, status
    const byType: Record<SafetyIncidentType, number> = {
      INJURY: 0,
      PROPERTY_DAMAGE: 0,
      NEAR_MISS: 0,
      VIOLATION: 0,
      CREW_ISSUE: 0,
    };

    const bySeverity: Record<SafetyIncidentSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    const byStatus: Record<SafetyIncidentStatus, number> = {
      OPEN: 0,
      UNDER_REVIEW: 0,
      CLOSED: 0,
    };

    for (const incident of incidents) {
      byType[incident.type as SafetyIncidentType]++;
      bySeverity[incident.severity as SafetyIncidentSeverity]++;
      byStatus[incident.status as SafetyIncidentStatus]++;
    }

    return {
      total: incidents.length,
      byType,
      bySeverity,
      byStatus,
      incidentsLast30Days,
    };
  }

  /**
   * Get OSHA summary for a year
   */
  async getOshaSummary(year: number): Promise<OshalogSummaryDTO> {
    this.logger.log(`Generating OSHA summary for year ${year}`);

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    const incidents = await prisma.safetyIncident.findMany({
      where: {
        occurredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalRecordableIncidents = 0;
    let daysAwayFromWork = 0;
    const restrictedOrTransferCases = 0;
    let otherRecordableCases = 0;

    const byIncidentType: Record<SafetyIncidentType, number> = {
      INJURY: 0,
      PROPERTY_DAMAGE: 0,
      NEAR_MISS: 0,
      VIOLATION: 0,
      CREW_ISSUE: 0,
    };

    for (const incident of incidents) {
      byIncidentType[incident.type as SafetyIncidentType]++;

      // OSHA recordable: medical treatment required OR lost time
      if (incident.medicalTreatmentRequired || incident.lostTimeDays) {
        totalRecordableIncidents++;

        if (incident.lostTimeDays && incident.lostTimeDays > 0) {
          daysAwayFromWork += incident.lostTimeDays;
          // For simplicity, treat all lost time cases as days away
          // In real OSHA, we'd distinguish between days away, restricted, transfer
        } else if (incident.medicalTreatmentRequired) {
          otherRecordableCases++;
        }
      }
    }

    return {
      year,
      totalRecordableIncidents,
      daysAwayFromWork,
      restrictedOrTransferCases,
      otherRecordableCases,
      byIncidentType,
    };
  }

  /**
   * Create safety checklist
   */
  async createChecklist(input: CreateSafetyChecklistDto): Promise<SafetyChecklistDTO> {
    this.logger.log(`Creating safety checklist: type=${input.type}`);

    const checklist = await prisma.safetyChecklist.create({
      data: {
        jobId: input.jobId,
        subcontractorId: input.subcontractorId,
        type: input.type,
        date: new Date(input.date),
        completedBy: input.completedBy,
        notes: input.notes,
        itemsJson: input.items as any,
      },
    });

    return {
      id: checklist.id,
      jobId: checklist.jobId || undefined,
      subcontractorId: checklist.subcontractorId || undefined,
      type: checklist.type as SafetyChecklistType,
      date: checklist.date.toISOString(),
      completedBy: checklist.completedBy || undefined,
      notes: checklist.notes || undefined,
      items: checklist.itemsJson as any,
    };
  }

  /**
   * List checklists with filters
   */
  async listChecklists(filters: {
    jobId?: string;
    subcontractorId?: string;
    type?: SafetyChecklistType;
    fromDate?: string;
    toDate?: string;
  }): Promise<SafetyChecklistDTO[]> {
    const where: any = {};

    if (filters.jobId) {
      where.jobId = filters.jobId;
    }

    if (filters.subcontractorId) {
      where.subcontractorId = filters.subcontractorId;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.fromDate || filters.toDate) {
      where.date = {};
      if (filters.fromDate) {
        where.date.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.date.lte = new Date(filters.toDate);
      }
    }

    const checklists = await prisma.safetyChecklist.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return checklists.map(
      (checklist: {
        id: string;
        jobId: string | null;
        subcontractorId: string | null;
        type: string;
        date: Date;
        completedBy: string | null;
        notes: string | null;
        itemsJson: any;
      }) => ({
        id: checklist.id,
        jobId: checklist.jobId || undefined,
        subcontractorId: checklist.subcontractorId || undefined,
        type: checklist.type as SafetyChecklistType,
        date: checklist.date.toISOString(),
        completedBy: checklist.completedBy || undefined,
        notes: checklist.notes || undefined,
        items: checklist.itemsJson as any,
      })
    );
  }

  /**
   * Notify JobNimbus of safety incident
   */
  private async notifyJobNimbusOfIncident(incident: any): Promise<void> {
    if (!this.jobNimbusClient || !incident.job?.jobNimbusId) {
      return;
    }

    try {
      const jobNimbusId = incident.job.jobNimbusId;

      // Create note
      const noteText = `⚠️ SAFETY INCIDENT: ${incident.type} – Severity ${incident.severity}. ${incident.description.substring(0, 100)}${incident.description.length > 100 ? '...' : ''}`;

      await this.jobNimbusClient.createNote(jobNimbusId, {
        text: noteText,
      });

      // Create task for HIGH or CRITICAL
      if (['HIGH', 'CRITICAL'].includes(incident.severity)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        await this.jobNimbusClient.createTask(jobNimbusId, {
          title: `Review ${incident.severity.toLowerCase()} safety incident: ${incident.type}`,
          dueDate: tomorrow.toISOString(),
        });

        this.logger.log(`Created JobNimbus note and task for incident ${incident.id}`);
      } else {
        this.logger.log(`Created JobNimbus note for incident ${incident.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create JobNimbus notification for incident ${incident.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Map Prisma incident to DTO
   */
  private mapIncidentToDTO(incident: any): SafetyIncidentDTO {
    return {
      id: incident.id,
      jobId: incident.jobId || undefined,
      jobNumber: incident.job?.jobNimbusId || undefined,
      subcontractorId: incident.subcontractorId || undefined,
      subcontractorName: incident.subcontractor?.name || undefined,
      type: incident.type as SafetyIncidentType,
      severity: incident.severity as SafetyIncidentSeverity,
      description: incident.description,
      occurredAt: incident.occurredAt.toISOString(),
      reportedAt: incident.reportedAt.toISOString(),
      reportedBy: incident.reportedBy || undefined,
      location: incident.location || undefined,
      latitude: incident.latitude || undefined,
      longitude: incident.longitude || undefined,
      status: incident.status as SafetyIncidentStatus,
      lostTimeDays: incident.lostTimeDays || undefined,
      medicalTreatmentRequired: incident.medicalTreatmentRequired || undefined,
      photos: incident.photos
        ? incident.photos.map((photo: any) => ({
            id: photo.id,
            url: photo.url,
            caption: photo.caption || undefined,
            uploadedAt: photo.uploadedAt.toISOString(),
          }))
        : [],
    };
  }
}
