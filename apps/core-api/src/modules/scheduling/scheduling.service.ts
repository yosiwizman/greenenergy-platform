import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import { MaterialService } from '../material/material.service';
import type {
  SchedulingRiskDTO,
  SchedulingRiskLevel,
  MaterialEtaStatus,
} from '@greenenergy/shared-types';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(private readonly materialService: MaterialService) {}

  /**
   * Get scheduling overview for all active jobs
   */
  async getSchedulingOverview(): Promise<SchedulingRiskDTO[]> {
    this.logger.log('Computing scheduling overview for all active jobs');

    // Get all jobs that are not completed or cancelled
    const activeStatuses = [
      'LEAD',
      'QUALIFIED',
      'SITE_SURVEY',
      'DESIGN',
      'PERMITTING',
      'APPROVED',
      'SCHEDULED',
      'IN_PROGRESS',
      'INSPECTION',
    ];

    const jobs = await prisma.job.findMany({
      where: {
        status: { in: activeStatuses },
      },
      include: {
        materialOrders: true,
        riskSnapshot: true,
        subcontractorAssignments: {
          where: {
            unassignedAt: null,
            isPrimary: true,
          },
          include: {
            subcontractor: {
              select: {
                name: true,
                performanceStatus: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Compute scheduling risk for each job
    const schedulingRisks = jobs.map((job) => this.computeJobSchedulingRisk(job));

    return schedulingRisks;
  }

  /**
   * Get scheduling risk for a single job
   */
  async getSchedulingForJob(jobId: string): Promise<SchedulingRiskDTO | null> {
    this.logger.log(`Computing scheduling risk for job: ${jobId}`);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        materialOrders: true,
        riskSnapshot: true,
        subcontractorAssignments: {
          where: {
            unassignedAt: null,
            isPrimary: true,
          },
          include: {
            subcontractor: {
              select: {
                name: true,
                performanceStatus: true,
              },
            },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return this.computeJobSchedulingRisk(job);
  }

  /**
   * Compute scheduling risk for a job based on materials, risk flags, and subcontractors
   */
  private computeJobSchedulingRisk(job: any): SchedulingRiskDTO {
    let schedulingRiskLevel: SchedulingRiskLevel = 'LOW';
    const reasons: string[] = [];

    // 1. Evaluate material ETA status
    const materialEtaStatus = this.getMaterialEtaStatusForJob(job.materialOrders);

    if (materialEtaStatus === 'LATE') {
      schedulingRiskLevel = 'HIGH';
      reasons.push('Material delivery late');
    } else if (materialEtaStatus === 'AT_RISK') {
      schedulingRiskLevel = this.upgradeRiskLevel(schedulingRiskLevel, 'MEDIUM');
      reasons.push('Material delivery at risk');
    }

    // 2. Check existing risk snapshot
    const hasHighRiskFlags = job.riskSnapshot?.riskLevel === 'HIGH';
    if (hasHighRiskFlags) {
      schedulingRiskLevel = 'HIGH';
      reasons.push('Job risk level is HIGH');
    } else if (job.riskSnapshot?.riskLevel === 'MEDIUM') {
      schedulingRiskLevel = this.upgradeRiskLevel(schedulingRiskLevel, 'MEDIUM');
      reasons.push('Job risk level is MEDIUM');
    }

    // 3. Check subcontractor status
    const primaryAssignment = job.subcontractorAssignments?.[0];
    const subcontractorStatus = primaryAssignment?.subcontractor
      ?.performanceStatus as 'GREEN' | 'YELLOW' | 'RED' | null;
    const subcontractorName = primaryAssignment?.subcontractor?.name || null;

    if (subcontractorStatus === 'RED') {
      schedulingRiskLevel = 'HIGH';
      reasons.push('Subcontractor status RED');
    } else if (subcontractorStatus === 'YELLOW') {
      schedulingRiskLevel = this.upgradeRiskLevel(schedulingRiskLevel, 'MEDIUM');
      reasons.push('Subcontractor status YELLOW');
    }

    // If no reasons found, set a default reason
    if (reasons.length === 0) {
      reasons.push('No scheduling risks detected');
    }

    return {
      jobId: job.id,
      jobNumber: job.jobNimbusId || job.id.substring(0, 8).toUpperCase(),
      customerName: job.customerName,
      status: job.status,
      materialEtaStatus,
      hasHighRiskFlags,
      subcontractorName,
      subcontractorStatus,
      schedulingRiskLevel,
      reasons,
    };
  }

  /**
   * Determine the worst material ETA status for a job
   */
  private getMaterialEtaStatusForJob(materialOrders: any[]): MaterialEtaStatus {
    if (!materialOrders || materialOrders.length === 0) {
      return 'ON_TRACK'; // No materials = no risk from materials
    }

    // Compute ETA status for each order
    const etaStatuses = materialOrders.map((order) => this.computeOrderEtaStatus(order));

    // If any are LATE, job is LATE
    if (etaStatuses.includes('LATE')) {
      return 'LATE';
    }

    // If any are AT_RISK, job is AT_RISK
    if (etaStatuses.includes('AT_RISK')) {
      return 'AT_RISK';
    }

    // Otherwise ON_TRACK
    return 'ON_TRACK';
  }

  /**
   * Compute ETA status for a single material order (same logic as MaterialService)
   */
  private computeOrderEtaStatus(order: any): MaterialEtaStatus {
    const { status, expectedDeliveryDate, actualDeliveryDate } = order;

    if (status === 'DELIVERED') {
      return 'ON_TRACK';
    }

    if (!expectedDeliveryDate) {
      return 'AT_RISK';
    }

    const now = new Date();
    const expectedDate = new Date(expectedDeliveryDate);

    if (expectedDate < now && !actualDeliveryDate) {
      return 'LATE';
    }

    const daysUntilDelivery = Math.ceil(
      (expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilDelivery <= 3 && daysUntilDelivery >= 0) {
      return 'AT_RISK';
    }

    return 'ON_TRACK';
  }

  /**
   * Upgrade risk level if needed (cannot downgrade)
   */
  private upgradeRiskLevel(
    current: SchedulingRiskLevel,
    proposed: SchedulingRiskLevel,
  ): SchedulingRiskLevel {
    const levels: SchedulingRiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
    const currentIndex = levels.indexOf(current);
    const proposedIndex = levels.indexOf(proposed);

    return proposedIndex > currentIndex ? proposed : current;
  }
}
