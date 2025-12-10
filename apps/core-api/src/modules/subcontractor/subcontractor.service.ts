import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';
import type {
  SubcontractorDTO,
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  SubcontractorComplianceStatus,
  SubcontractorPerformanceSummary,
  SubcontractorPerformanceFactor,
  SubcontractorPerformanceStatus,
  JobSubcontractorAssignmentDTO,
  AssignSubcontractorDto,
} from '@greenenergy/shared-types';

@Injectable()
export class SubcontractorService {
  private readonly logger = new Logger(SubcontractorService.name);
  private readonly jobNimbusClient: JobNimbusClient;

  constructor(private configService: ConfigService) {
    this.jobNimbusClient = new JobNimbusClient({
      baseUrl: this.configService.get<string>('JOBNIMBUS_BASE_URL') || '',
      apiKey: this.configService.get<string>('JOBNIMBUS_API_KEY') || '',
      timeout: 30000,
    });
  }

  /**
   * List all subcontractors with optional filters
   */
  async listSubcontractors(filters?: {
    isActive?: boolean;
    isCompliant?: boolean;
    performanceStatus?: SubcontractorPerformanceStatus;
  }): Promise<SubcontractorDTO[]> {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isCompliant !== undefined) {
      where.lastComplianceStatus = filters.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT';
    }

    if (filters?.performanceStatus) {
      where.performanceStatus = filters.performanceStatus;
    }

    const subcontractors = await prisma.subcontractor.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return subcontractors.map((sub: any) => this.mapToDTO(sub));
  }

  /**
   * Get a single subcontractor by ID
   */
  async getSubcontractorById(id: string): Promise<SubcontractorDTO> {
    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id },
    });

    if (!subcontractor) {
      throw new NotFoundException(`Subcontractor with ID ${id} not found`);
    }

    return this.mapToDTO(subcontractor);
  }

  /**
   * Create a new subcontractor
   */
  async createSubcontractor(input: CreateSubcontractorDto): Promise<SubcontractorDTO> {
    this.logger.log(`Creating subcontractor: ${input.name}`);

    const subcontractor = await prisma.subcontractor.create({
      data: {
        name: input.name,
        legalName: input.legalName,
        primaryContact: input.primaryContact,
        phone: input.phone,
        email: input.email,
        crewSize: input.crewSize,
        licenseNumber: input.licenseNumber,
        licenseExpiresAt: input.licenseExpiresAt ? new Date(input.licenseExpiresAt) : null,
        insurancePolicyNumber: input.insurancePolicyNumber,
        insuranceExpiresAt: input.insuranceExpiresAt
          ? new Date(input.insuranceExpiresAt)
          : null,
        w9Received: input.w9Received || false,
        coiReceived: input.coiReceived || false,
        specialties: input.specialties || [],
      },
    });

    // Evaluate initial compliance
    await this.evaluateCompliance(subcontractor.id);

    return this.mapToDTO(subcontractor);
  }

  /**
   * Update a subcontractor
   */
  async updateSubcontractor(
    id: string,
    input: UpdateSubcontractorDto
  ): Promise<SubcontractorDTO> {
    this.logger.log(`Updating subcontractor: ${id}`);

    const existing = await prisma.subcontractor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Subcontractor with ID ${id} not found`);
    }

    const updated = await prisma.subcontractor.update({
      where: { id },
      data: {
        name: input.name,
        legalName: input.legalName,
        primaryContact: input.primaryContact,
        phone: input.phone,
        email: input.email,
        crewSize: input.crewSize,
        licenseNumber: input.licenseNumber,
        licenseExpiresAt: input.licenseExpiresAt ? new Date(input.licenseExpiresAt) : undefined,
        insurancePolicyNumber: input.insurancePolicyNumber,
        insuranceExpiresAt: input.insuranceExpiresAt
          ? new Date(input.insuranceExpiresAt)
          : undefined,
        w9Received: input.w9Received,
        coiReceived: input.coiReceived,
        specialties: input.specialties,
        isActive: input.isActive,
      },
    });

    // Re-evaluate compliance if relevant fields changed
    if (
      input.licenseNumber !== undefined ||
      input.licenseExpiresAt !== undefined ||
      input.insurancePolicyNumber !== undefined ||
      input.insuranceExpiresAt !== undefined ||
      input.w9Received !== undefined ||
      input.coiReceived !== undefined
    ) {
      await this.evaluateCompliance(id);
    }

    return this.mapToDTO(updated);
  }

  /**
   * Deactivate a subcontractor
   */
  async deactivateSubcontractor(id: string): Promise<void> {
    this.logger.log(`Deactivating subcontractor: ${id}`);

    const existing = await prisma.subcontractor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Subcontractor with ID ${id} not found`);
    }

    await prisma.subcontractor.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Evaluate compliance for a subcontractor
   */
  async evaluateCompliance(subcontractorId: string): Promise<SubcontractorComplianceStatus> {
    this.logger.log(`Evaluating compliance for subcontractor: ${subcontractorId}`);

    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id: subcontractorId },
    });

    if (!subcontractor) {
      throw new NotFoundException(`Subcontractor with ID ${subcontractorId} not found`);
    }

    const now = new Date();
    const missingItems: string[] = [];

    // Check license
    const hasValidLicense =
      !!subcontractor.licenseNumber &&
      !!subcontractor.licenseExpiresAt &&
      subcontractor.licenseExpiresAt > now;

    if (!subcontractor.licenseNumber) {
      missingItems.push('LICENSE_MISSING');
    } else if (!subcontractor.licenseExpiresAt || subcontractor.licenseExpiresAt <= now) {
      missingItems.push('LICENSE_EXPIRED');
    }

    // Check insurance
    const hasValidInsurance =
      !!subcontractor.insurancePolicyNumber &&
      !!subcontractor.insuranceExpiresAt &&
      subcontractor.insuranceExpiresAt > now;

    if (!subcontractor.insurancePolicyNumber) {
      missingItems.push('INSURANCE_MISSING');
    } else if (
      !subcontractor.insuranceExpiresAt ||
      subcontractor.insuranceExpiresAt <= now
    ) {
      missingItems.push('INSURANCE_EXPIRED');
    }

    // Check W9
    const hasW9 = subcontractor.w9Received;
    if (!hasW9) {
      missingItems.push('W9_MISSING');
    }

    // Check COI
    const hasCOI = subcontractor.coiReceived;
    if (!hasCOI) {
      missingItems.push('COI_MISSING');
    }

    const isCompliant = hasValidLicense && hasValidInsurance && hasW9 && hasCOI;

    const complianceStatus: SubcontractorComplianceStatus = {
      hasValidLicense,
      hasValidInsurance,
      hasW9,
      hasCOI,
      isCompliant,
      missingItems,
    };

    // Check for compliance state change and trigger JobNimbus integration
    const previousStatus = subcontractor.lastComplianceStatus;
    const newStatus = isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT';

    if (previousStatus === 'COMPLIANT' && newStatus === 'NON_COMPLIANT') {
      this.logger.warn(
        `Subcontractor ${subcontractor.name} transitioned to NON-COMPLIANT. Triggering JobNimbus notifications.`
      );
      await this.notifyJobNimbusOfNonCompliance(subcontractorId, missingItems);
    }

    // Update compliance status
    await prisma.subcontractor.update({
      where: { id: subcontractorId },
      data: { lastComplianceStatus: newStatus },
    });

    return complianceStatus;
  }

  /**
   * Evaluate compliance for all subcontractors
   */
  async evaluateComplianceForAll(): Promise<{ total: number; nonCompliant: number }> {
    this.logger.log('Evaluating compliance for all active subcontractors');

    const subcontractors = await prisma.subcontractor.findMany({
      where: { isActive: true },
    });

    let nonCompliant = 0;

    for (const sub of subcontractors) {
      try {
        const status = await this.evaluateCompliance(sub.id);
        if (!status.isCompliant) {
          nonCompliant++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to evaluate compliance for ${sub.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      total: subcontractors.length,
      nonCompliant,
    };
  }

  /**
   * Notify JobNimbus of non-compliant subcontractor
   */
  private async notifyJobNimbusOfNonCompliance(
    subcontractorId: string,
    missingItems: string[]
  ): Promise<void> {
    try {
      // Find all active jobs assigned to this subcontractor
      const assignments = await prisma.jobSubcontractorAssignment.findMany({
        where: {
          subcontractorId,
          unassignedAt: null,
        },
        include: {
          job: true,
          subcontractor: true,
        },
      });

      if (assignments.length === 0) {
        this.logger.log(`No active job assignments found for subcontractor ${subcontractorId}`);
        return;
      }

      const subcontractorName = assignments[0]?.subcontractor.name || 'Unknown';
      const missingItemsText = missingItems
        .map((item) => item.replace(/_/g, ' ').toLowerCase())
        .join(', ');

      for (const assignment of assignments) {
        if (!assignment.job.jobNimbusId) {
          this.logger.warn(
            `Job ${assignment.jobId} has no JobNimbus ID, skipping notification`
          );
          continue;
        }

        try {
          // Create note in JobNimbus
          await this.jobNimbusClient.createNote(assignment.job.jobNimbusId, {
            text: `⚠️ SUBCONTRACTOR NON-COMPLIANT: ${subcontractorName}. Missing/expired: ${missingItemsText}. Please review before scheduling.`,
          });

          // Optionally create a task
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          await this.jobNimbusClient.createTask(assignment.job.jobNimbusId, {
            title: `Resolve subcontractor compliance: ${subcontractorName} (Missing: ${missingItemsText})`,
            dueDate: tomorrow.toISOString(),
          });

          this.logger.log(
            `Created JobNimbus note and task for job ${assignment.job.jobNimbusId}`
          );
        } catch (error) {
          this.logger.error(
            `Failed to create JobNimbus notification for job ${assignment.job.jobNimbusId}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify JobNimbus of non-compliance for ${subcontractorId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Assign subcontractor to job
   */
  async assignSubcontractorToJob(
    jobId: string,
    input: AssignSubcontractorDto
  ): Promise<JobSubcontractorAssignmentDTO> {
    this.logger.log(
      `Assigning subcontractor ${input.subcontractorId} to job ${jobId}`
    );

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Verify subcontractor exists and is active
    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id: input.subcontractorId },
    });

    if (!subcontractor) {
      throw new NotFoundException(
        `Subcontractor with ID ${input.subcontractorId} not found`
      );
    }

    if (!subcontractor.isActive) {
      throw new BadRequestException(
        `Subcontractor ${subcontractor.name} is inactive and cannot be assigned`
      );
    }

    // Check compliance
    const complianceStatus = await this.evaluateCompliance(input.subcontractorId);
    if (!complianceStatus.isCompliant) {
      throw new ConflictException(
        `Subcontractor ${subcontractor.name} is non-compliant and cannot be assigned. Missing: ${complianceStatus.missingItems.join(', ')}`
      );
    }

    // If isPrimary is true, unset other primary assignments
    if (input.isPrimary) {
      await prisma.jobSubcontractorAssignment.updateMany({
        where: {
          jobId,
          isPrimary: true,
          unassignedAt: null,
        },
        data: { isPrimary: false },
      });
    }

    // Create assignment
    const assignment = await prisma.jobSubcontractorAssignment.create({
      data: {
        jobId,
        subcontractorId: input.subcontractorId,
        role: input.role,
        isPrimary: input.isPrimary || false,
      },
      include: {
        subcontractor: true,
      },
    });

    return {
      id: assignment.id,
      jobId: assignment.jobId,
      subcontractorId: assignment.subcontractorId,
      subcontractorName: assignment.subcontractor.name,
      role: assignment.role || undefined,
      assignedAt: assignment.assignedAt.toISOString(),
      isPrimary: assignment.isPrimary,
    };
  }

  /**
   * Unassign subcontractor from job
   */
  async unassignSubcontractorFromJob(assignmentId: string): Promise<void> {
    this.logger.log(`Unassigning subcontractor assignment: ${assignmentId}`);

    const assignment = await prisma.jobSubcontractorAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    await prisma.jobSubcontractorAssignment.update({
      where: { id: assignmentId },
      data: { unassignedAt: new Date() },
    });
  }

  /**
   * List subcontractors assigned to a job
   */
  async listJobSubcontractors(jobId: string): Promise<JobSubcontractorAssignmentDTO[]> {
    const assignments = await prisma.jobSubcontractorAssignment.findMany({
      where: {
        jobId,
        unassignedAt: null,
      },
      include: {
        subcontractor: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
    });

    return assignments.map((a: { id: string; jobId: string; subcontractorId: string; subcontractor: { name: string }; role: string | null; assignedAt: Date; unassignedAt: Date | null; isPrimary: boolean }) => ({
      id: a.id,
      jobId: a.jobId,
      subcontractorId: a.subcontractorId,
      subcontractorName: a.subcontractor.name,
      role: a.role || undefined,
      assignedAt: a.assignedAt.toISOString(),
      unassignedAt: a.unassignedAt?.toISOString(),
      isPrimary: a.isPrimary,
    }));
  }

  /**
   * Evaluate performance for a subcontractor
   */
  async evaluateSubcontractorPerformance(
    subcontractorId: string
  ): Promise<SubcontractorPerformanceSummary> {
    this.logger.log(`Evaluating performance for subcontractor: ${subcontractorId}`);

    const subcontractor = await prisma.subcontractor.findUnique({
      where: { id: subcontractorId },
    });

    if (!subcontractor) {
      throw new NotFoundException(`Subcontractor with ID ${subcontractorId} not found`);
    }

    // Get jobs assigned to this subcontractor
    const assignments = await prisma.jobSubcontractorAssignment.findMany({
      where: { subcontractorId },
      select: { jobId: true },
    });

    const jobIds = assignments.map((a: { jobId: string }) => a.jobId);

    // Count QC failures
    const qcFailures = await prisma.qCPhotoCheck.count({
      where: {
        jobId: { in: jobIds },
        status: 'FAIL',
      },
    });

    // Count safety incidents
    const safetyIncidents = await prisma.safetyIncident.count({
      where: {
        subcontractorId,
      },
    });

    // For now, stub other metrics (can be expanded later)
    const inspectionFailures = 0; // TODO: implement when inspection model exists
    const delayIncidents = 0; // TODO: implement when delay tracking exists
    const customerComplaints = 0; // TODO: implement when complaint tracking exists

    // Calculate score
    const factors: SubcontractorPerformanceFactor[] = [];
    let score = 100;

    // QC failures: -5 points each
    if (qcFailures > 0) {
      const deduction = qcFailures * 5;
      score -= deduction;
      factors.push({
        label: `QC Failures (${qcFailures})`,
        value: qcFailures,
        weight: 5,
        impact: 'NEGATIVE',
      });
    }

    // Safety incidents: -10 points each
    if (safetyIncidents > 0) {
      const deduction = safetyIncidents * 10;
      score -= deduction;
      factors.push({
        label: `Safety Incidents (${safetyIncidents})`,
        value: safetyIncidents,
        weight: 10,
        impact: 'NEGATIVE',
      });
    }

    // Inspection failures: -8 points each (stubbed)
    if (inspectionFailures > 0) {
      const deduction = inspectionFailures * 8;
      score -= deduction;
      factors.push({
        label: `Inspection Failures (${inspectionFailures})`,
        value: inspectionFailures,
        weight: 8,
        impact: 'NEGATIVE',
      });
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Map score to status
    let status: SubcontractorPerformanceStatus;
    if (score >= 85) {
      status = 'GREEN';
    } else if (score >= 70) {
      status = 'YELLOW';
    } else {
      status = 'RED';
    }

    // Update subcontractor
    await prisma.subcontractor.update({
      where: { id: subcontractorId },
      data: {
        performanceScore: score,
        performanceStatus: status,
        lastEvaluatedAt: new Date(),
      },
    });

    return {
      subcontractorId,
      score,
      status,
      factors,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluate performance for all subcontractors
   */
  async evaluateAllSubcontractorsPerformance(): Promise<{
    total: number;
    evaluated: number;
  }> {
    this.logger.log('Evaluating performance for all active subcontractors');

    const subcontractors = await prisma.subcontractor.findMany({
      where: { isActive: true },
    });

    let evaluated = 0;

    for (const sub of subcontractors) {
      try {
        await this.evaluateSubcontractorPerformance(sub.id);
        evaluated++;
      } catch (error) {
        this.logger.error(
          `Failed to evaluate performance for ${sub.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      total: subcontractors.length,
      evaluated,
    };
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDTO(subcontractor: any): SubcontractorDTO {
    return {
      id: subcontractor.id,
      name: subcontractor.name,
      legalName: subcontractor.legalName || undefined,
      primaryContact: subcontractor.primaryContact || undefined,
      phone: subcontractor.phone || undefined,
      email: subcontractor.email || undefined,
      crewSize: subcontractor.crewSize || undefined,
      licenseNumber: subcontractor.licenseNumber || undefined,
      licenseExpiresAt: subcontractor.licenseExpiresAt?.toISOString(),
      insurancePolicyNumber: subcontractor.insurancePolicyNumber || undefined,
      insuranceExpiresAt: subcontractor.insuranceExpiresAt?.toISOString(),
      w9Received: subcontractor.w9Received,
      coiReceived: subcontractor.coiReceived,
      isActive: subcontractor.isActive,
      performanceScore: subcontractor.performanceScore || undefined,
      performanceStatus: subcontractor.performanceStatus || undefined,
      lastEvaluatedAt: subcontractor.lastEvaluatedAt?.toISOString(),
      lastComplianceStatus: subcontractor.lastComplianceStatus || undefined,
      specialties: subcontractor.specialties || [],
      totalJobsCompleted: subcontractor.totalJobsCompleted || 0,
      createdAt: subcontractor.createdAt?.toISOString(),
      updatedAt: subcontractor.updatedAt?.toISOString(),
    };
  }
}
