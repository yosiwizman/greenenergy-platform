import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import type { JobRiskSnapshotDTO, RiskReason, RiskReasonCode } from '@greenenergy/shared-types';

// Risk threshold configuration
export interface RiskThresholdConfig {
  stuckStatusDaysMedium: number;
  stuckStatusDaysHigh: number;
  staleJobDaysMedium: number;
  staleJobDaysHigh: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholdConfig = {
  stuckStatusDaysMedium: 7,
  stuckStatusDaysHigh: 14,
  staleJobDaysMedium: 7,
  staleJobDaysHigh: 14,
};

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);
  private readonly thresholds: RiskThresholdConfig;
  private readonly jobNimbusBaseUrl: string;

  constructor(private configService: ConfigService) {
    // Load thresholds from config or use defaults
    this.thresholds = {
      stuckStatusDaysMedium:
        this.configService.get<number>('RISK_STUCK_STATUS_DAYS_MEDIUM') ||
        DEFAULT_RISK_THRESHOLDS.stuckStatusDaysMedium,
      stuckStatusDaysHigh:
        this.configService.get<number>('RISK_STUCK_STATUS_DAYS_HIGH') ||
        DEFAULT_RISK_THRESHOLDS.stuckStatusDaysHigh,
      staleJobDaysMedium:
        this.configService.get<number>('RISK_STALE_JOB_DAYS_MEDIUM') ||
        DEFAULT_RISK_THRESHOLDS.staleJobDaysMedium,
      staleJobDaysHigh:
        this.configService.get<number>('RISK_STALE_JOB_DAYS_HIGH') ||
        DEFAULT_RISK_THRESHOLDS.staleJobDaysHigh,
    };

    this.jobNimbusBaseUrl =
      this.configService.get<string>('JOBNIMBUS_APP_BASE_URL') || 'https://app.jobnimbus.com';
  }

  /**
   * Evaluate risk for a specific job based on multiple factors
   */
  async evaluateJobRisk(jobId: string): Promise<JobRiskSnapshotDTO> {
    this.logger.log(`Evaluating risk for job: ${jobId}`);

    // Load job and related data
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        qcPhotoChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        contacts: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Initialize risk reasons
    const reasons: RiskReason[] = [];

    // Rule 1: STUCK_IN_STATUS
    // Check how long the job has been in current status
    const daysSinceUpdate = this.getDaysSince(job.updatedAt);
    if (daysSinceUpdate >= this.thresholds.stuckStatusDaysHigh) {
      reasons.push({
        code: 'STUCK_IN_STATUS',
        label: 'Stuck in status',
        description: `Job has been in ${job.status} status for ${daysSinceUpdate} days (threshold: ${this.thresholds.stuckStatusDaysHigh} days)`,
        severity: 'HIGH',
      });
    } else if (daysSinceUpdate >= this.thresholds.stuckStatusDaysMedium) {
      reasons.push({
        code: 'STUCK_IN_STATUS',
        label: 'Stuck in status',
        description: `Job has been in ${job.status} status for ${daysSinceUpdate} days (threshold: ${this.thresholds.stuckStatusDaysMedium} days)`,
        severity: 'MEDIUM',
      });
    }

    // Rule 2: MISSING_QC_PHOTOS
    // Check if latest QC result is FAIL
    const latestQC = job.qcPhotoChecks[0];
    if (latestQC && latestQC.status === 'FAIL') {
      const missingCategories = JSON.parse(latestQC.missingCategoriesJson);
      const categoryDetails = missingCategories
        .map(
          (m: { category: string; actualCount: number; requiredCount: number }) =>
            `${m.category} (${m.actualCount}/${m.requiredCount})`
        )
        .join(', ');

      reasons.push({
        code: 'MISSING_QC_PHOTOS',
        label: 'Missing QC photos',
        description: `Missing required photos: ${categoryDetails}`,
        severity: 'HIGH',
      });
    }

    // Rule 3: STALE_JOB
    // Check if job hasn't been updated recently
    const daysSinceLastUpdate = this.getDaysSince(job.updatedAt);
    if (daysSinceLastUpdate >= this.thresholds.staleJobDaysHigh) {
      reasons.push({
        code: 'STALE_JOB',
        label: 'Stale job',
        description: `Job has not been updated for ${daysSinceLastUpdate} days (threshold: ${this.thresholds.staleJobDaysHigh} days)`,
        severity: 'HIGH',
      });
    } else if (daysSinceLastUpdate >= this.thresholds.staleJobDaysMedium) {
      reasons.push({
        code: 'STALE_JOB',
        label: 'Stale job',
        description: `Job has not been updated for ${daysSinceLastUpdate} days (threshold: ${this.thresholds.staleJobDaysMedium} days)`,
        severity: 'MEDIUM',
      });
    }

    // Rule 4: MISSING_DOCUMENTS
    // TODO: Implement when document model is available
    // For now, this is a placeholder for future implementation
    // Check for required documents like PERMIT, NOC, etc.

    // Rule 5: SAFETY_INCIDENT
    // Check for open or under-review safety incidents
    const openIncidents = await prisma.safetyIncident.findMany({
      where: {
        jobId: job.id,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
    });

    if (openIncidents.length > 0) {
      // Count by severity
      const criticalCount = openIncidents.filter((inc) => inc.severity === 'CRITICAL').length;
      const highCount = openIncidents.filter((inc) => inc.severity === 'HIGH').length;
      const mediumCount = openIncidents.filter((inc) => inc.severity === 'MEDIUM').length;

      if (criticalCount > 0 || highCount > 0) {
        reasons.push({
          code: 'SAFETY_INCIDENT',
          label: 'Open safety incidents',
          description: `Job has ${criticalCount} critical and ${highCount} high-severity open safety incidents`,
          severity: 'HIGH',
        });
      } else if (mediumCount > 0) {
        reasons.push({
          code: 'SAFETY_INCIDENT',
          label: 'Open safety incidents',
          description: `Job has ${mediumCount} medium-severity open safety incidents`,
          severity: 'MEDIUM',
        });
      }
    }

    // Compute overall risk level from reasons
    const riskLevel = this.computeRiskLevel(reasons);

    // Construct DTO
    const snapshot: JobRiskSnapshotDTO = {
      jobId: job.id,
      jobNumber: job.jobNimbusId || job.id.substring(0, 8).toUpperCase(),
      customerName: job.customerName,
      currentStatus: job.status,
      riskLevel,
      reasons,
      lastUpdatedAt: job.updatedAt.toISOString(),
      riskComputedAt: new Date().toISOString(),
      jobNimbusUrl: job.jobNimbusId ? `${this.jobNimbusBaseUrl}/job/${job.jobNimbusId}` : undefined,
    };

    // Persist snapshot to database
    await prisma.jobRiskSnapshot.upsert({
      where: { jobId: job.id },
      create: {
        jobId: job.id,
        riskLevel,
        reasonsJson: JSON.stringify(reasons),
        lastUpdatedAt: job.updatedAt,
        riskComputedAt: new Date(),
      },
      update: {
        riskLevel,
        reasonsJson: JSON.stringify(reasons),
        lastUpdatedAt: job.updatedAt,
        riskComputedAt: new Date(),
      },
    });

    this.logger.log(`Risk evaluation complete for job ${jobId}: ${riskLevel}`);
    return snapshot;
  }

  /**
   * Evaluate risk for all jobs
   */
  async evaluateAllJobsRisk(): Promise<{
    totalJobs: number;
    evaluated: number;
    errors: string[];
  }> {
    this.logger.log('Evaluating risk for all jobs');

    const jobs = await prisma.job.findMany({
      where: {
        // Optionally filter for active jobs only
        status: { not: 'CANCELLED' },
      },
      select: { id: true, customerName: true },
    });

    const summary = {
      totalJobs: jobs.length,
      evaluated: 0,
      errors: [] as string[],
    };

    for (const job of jobs) {
      try {
        await this.evaluateJobRisk(job.id);
        summary.evaluated++;
      } catch (error) {
        const errorMsg = `Failed to evaluate risk for job ${job.id} (${job.customerName}): ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }

    this.logger.log(
      `Risk evaluation summary: ${summary.evaluated}/${summary.totalJobs} jobs evaluated`
    );
    return summary;
  }

  /**
   * Get the latest risk snapshot for a job
   */
  async getJobRiskSnapshot(jobId: string): Promise<JobRiskSnapshotDTO | null> {
    const snapshot = await prisma.jobRiskSnapshot.findUnique({
      where: { jobId },
      include: {
        job: {
          select: {
            id: true,
            jobNimbusId: true,
            customerName: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!snapshot) {
      return null;
    }

    const reasons: RiskReason[] = JSON.parse(snapshot.reasonsJson);

    return {
      jobId: snapshot.jobId,
      jobNumber: snapshot.job.jobNimbusId || snapshot.job.id.substring(0, 8).toUpperCase(),
      customerName: snapshot.job.customerName,
      currentStatus: snapshot.job.status,
      riskLevel: snapshot.riskLevel as RiskLevel,
      reasons,
      lastUpdatedAt: snapshot.lastUpdatedAt?.toISOString(),
      riskComputedAt: snapshot.riskComputedAt.toISOString(),
      jobNimbusUrl: snapshot.job.jobNimbusId
        ? `${this.jobNimbusBaseUrl}/job/${snapshot.job.jobNimbusId}`
        : undefined,
    };
  }

  /**
   * Get risk snapshots for all jobs
   */
  async getAllJobRisks(): Promise<JobRiskSnapshotDTO[]> {
    const snapshots = await prisma.jobRiskSnapshot.findMany({
      include: {
        job: {
          select: {
            id: true,
            jobNimbusId: true,
            customerName: true,
            status: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        riskComputedAt: 'desc',
      },
    });

    return snapshots.map((snapshot) => {
      const reasons: RiskReason[] = JSON.parse(snapshot.reasonsJson);

      return {
        jobId: snapshot.jobId,
        jobNumber: snapshot.job.jobNimbusId || snapshot.job.id.substring(0, 8).toUpperCase(),
        customerName: snapshot.job.customerName,
        currentStatus: snapshot.job.status,
        riskLevel: snapshot.riskLevel as RiskLevel,
        reasons,
        lastUpdatedAt: snapshot.lastUpdatedAt?.toISOString(),
        riskComputedAt: snapshot.riskComputedAt.toISOString(),
        jobNimbusUrl: snapshot.job.jobNimbusId
          ? `${this.jobNimbusBaseUrl}/job/${snapshot.job.jobNimbusId}`
          : undefined,
      };
    });
  }

  /**
   * Calculate days since a given date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Compute overall risk level from individual reasons
   */
  private computeRiskLevel(reasons: RiskReason[]): RiskLevel {
    if (reasons.length === 0) {
      return 'LOW';
    }

    // If any reason is HIGH severity, overall is HIGH
    if (reasons.some((r) => r.severity === 'HIGH')) {
      return 'HIGH';
    }

    // If any reason is MEDIUM severity, overall is MEDIUM
    if (reasons.some((r) => r.severity === 'MEDIUM')) {
      return 'MEDIUM';
    }

    return 'LOW';
  }
}
