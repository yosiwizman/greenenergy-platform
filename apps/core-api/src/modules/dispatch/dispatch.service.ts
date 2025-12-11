import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type {
  DispatchOverviewDTO,
  DispatchRecommendationDTO,
  DispatchJobCandidateDTO,
  DispatchCrewOptionDTO,
  DispatchRecommendationReason,
  DispatchRecommendationConfidence,
} from '@greenenergy/shared-types';

/**
 * DispatchService provides AI-driven (deterministic rule-based) crew assignment
 * recommendations based on performance, capacity, materials, risk, and compliance.
 */
@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  /**
   * Get dispatch overview for a specific date
   */
  async getOverviewForDate(date: Date): Promise<DispatchOverviewDTO> {
    this.logger.log(`Computing dispatch overview for date: ${date.toISOString()}`);

    // Normalize date to start of day
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get candidate jobs for the target date
    const candidateJobs = await this.getCandidateJobs(targetDate, nextDay);

    // Get available subcontractors
    const subcontractors = await prisma.subcontractor.findMany({
      where: {
        isActive: true,
      },
      include: {
        assignments: {
          where: {
            unassignedAt: null,
          },
          include: {
            job: {
              select: {
                scheduledDate: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Generate recommendations for each job
    const recommendations = await Promise.all(
      candidateJobs.map((job) => this.computeRecommendationForJob(job, subcontractors, targetDate))
    );

    // Calculate summary metrics
    const jobsDispatchable = recommendations.filter((r) => r.canStart).length;
    const jobsBlocked = recommendations.filter((r) => !r.canStart).length;

    return {
      date: targetDate.toISOString(),
      jobsTotal: candidateJobs.length,
      jobsDispatchable,
      jobsBlocked,
      recommendations,
    };
  }

  /**
   * Get dispatch recommendation for a single job
   */
  async getRecommendationsForJob(
    jobId: string,
    date?: Date
  ): Promise<DispatchRecommendationDTO | null> {
    this.logger.log(`Computing dispatch recommendation for job: ${jobId}`);

    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Get the job with all needed relations
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        riskSnapshot: true,
        financialSnapshot: true,
        materialOrders: true,
        qcPhotoChecks: {
          where: { status: 'FAIL' },
          take: 1,
        },
        safetyIncidents: {
          where: {
            status: { in: ['OPEN', 'UNDER_REVIEW'] },
            severity: { in: ['HIGH', 'CRITICAL'] },
          },
          take: 1,
        },
      },
    });

    if (!job) {
      return null;
    }

    // Get available subcontractors
    const subcontractors = await prisma.subcontractor.findMany({
      where: {
        isActive: true,
      },
      include: {
        assignments: {
          where: {
            unassignedAt: null,
          },
          include: {
            job: {
              select: {
                scheduledDate: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return this.computeRecommendationForJob(job, subcontractors, targetDate);
  }

  /**
   * Assign a subcontractor to a job
   */
  async assignSubcontractorToJob(
    jobId: string,
    subcontractorId: string,
    scheduledDate: Date
  ): Promise<void> {
    this.logger.log(
      `Assigning subcontractor ${subcontractorId} to job ${jobId} for ${scheduledDate.toISOString()}`
    );

    // Update job's scheduled date
    await prisma.job.update({
      where: { id: jobId },
      data: { scheduledDate },
    });

    // Check if assignment already exists
    const existingAssignment = await prisma.jobSubcontractorAssignment.findFirst({
      where: {
        jobId,
        subcontractorId,
        unassignedAt: null,
      },
    });

    if (!existingAssignment) {
      // Create new assignment
      await prisma.jobSubcontractorAssignment.create({
        data: {
          jobId,
          subcontractorId,
          isPrimary: true,
          role: 'DISPATCH_ASSIGNED',
        },
      });
    }

    this.logger.log(`Successfully assigned subcontractor ${subcontractorId} to job ${jobId}`);
  }

  /**
   * Get candidate jobs for dispatch on a specific date
   */
  private async getCandidateJobs(startDate: Date, endDate: Date): Promise<any[]> {
    // Get jobs that are:
    // 1. Scheduled for the target date, OR
    // 2. In progress statuses and not complete/cancelled
    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          {
            scheduledDate: {
              gte: startDate,
              lt: endDate,
            },
          },
          {
            scheduledDate: null,
            status: {
              in: ['APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'SITE_SURVEY', 'DESIGN', 'PERMITTING'],
            },
          },
        ],
        status: {
          notIn: ['COMPLETE', 'CANCELLED'],
        },
      },
      include: {
        riskSnapshot: true,
        financialSnapshot: true,
        materialOrders: true,
        qcPhotoChecks: {
          where: { status: 'FAIL' },
          take: 1,
        },
        safetyIncidents: {
          where: {
            status: { in: ['OPEN', 'UNDER_REVIEW'] },
            severity: { in: ['HIGH', 'CRITICAL'] },
          },
          take: 1,
        },
      },
      take: 500, // Limit for performance
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    return jobs;
  }

  /**
   * Compute dispatch recommendation for a single job
   */
  private async computeRecommendationForJob(
    job: any,
    subcontractors: any[],
    targetDate: Date
  ): Promise<DispatchRecommendationDTO> {
    // Build job candidate DTO
    const jobCandidate: DispatchJobCandidateDTO = {
      jobId: job.id,
      jobNumber: job.jobNimbusId || job.id.substring(0, 8).toUpperCase(),
      customerName: job.customerName,
      city: job.city,
      status: job.status,
      riskLevel: job.riskSnapshot?.riskLevel || null,
      scheduledDate: job.scheduledDate?.toISOString() || null,
      estimatedSystemSizeKw: job.systemSize || null,
      materialsEtaStatus: this.computeMaterialsEtaStatus(job.materialOrders),
      hasSafetyIssues: job.safetyIncidents.length > 0,
      hasQcIssues: job.qcPhotoChecks.length > 0,
    };

    // Check blocking conditions
    const blockingReasons: DispatchRecommendationReason[] = [];
    let canStart = true;

    // Materials not ready
    if (jobCandidate.materialsEtaStatus === 'LATE') {
      blockingReasons.push('MATERIALS_NOT_READY');
      canStart = false;
    }

    // High severity safety issues
    if (jobCandidate.hasSafetyIssues) {
      blockingReasons.push('COMPLIANCE_ISSUE');
      canStart = false;
    }

    // Score all subcontractors for this job
    const scoredOptions = subcontractors.map((sub) =>
      this.scoreSubcontractorForJob(sub, job, targetDate)
    );

    // Filter out null options (e.g., non-compliant or over capacity)
    const validOptions = scoredOptions.filter((opt): opt is DispatchCrewOptionDTO => opt !== null);

    // Sort by confidence (HIGH > MEDIUM > LOW) then by reasons count
    validOptions.sort((a, b) => {
      const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aScore = confidenceOrder[a.confidence];
      const bScore = confidenceOrder[b.confidence];
      if (aScore !== bScore) return bScore - aScore;
      return b.reasons.length - a.reasons.length;
    });

    // Pick best recommendation and alternatives
    const recommendedSubcontractor = validOptions[0] || null;
    const alternatives = validOptions.slice(1, 4); // Top 3 alternatives

    return {
      job: jobCandidate,
      recommendedSubcontractor,
      alternatives,
      scheduledDate: targetDate.toISOString(),
      canStart: canStart && recommendedSubcontractor !== null,
      blockingReasons,
    };
  }

  /**
   * Score a subcontractor for a specific job
   * Returns null if subcontractor is not viable
   */
  private scoreSubcontractorForJob(
    subcontractor: any,
    job: any,
    targetDate: Date
  ): DispatchCrewOptionDTO | null {
    const reasons: DispatchRecommendationReason[] = [];
    let score = 50; // Base score

    // Check compliance
    const isCompliant = subcontractor.lastComplianceStatus === 'COMPLIANT';
    if (!isCompliant) {
      // Non-compliant subs are excluded
      return null;
    }

    // Check performance status
    const perfStatus = subcontractor.performanceStatus as 'GREEN' | 'YELLOW' | 'RED' | null;
    if (perfStatus === 'RED') {
      // RED subs are excluded
      return null;
    }

    if (perfStatus === 'GREEN') {
      score += 30;
      reasons.push('HIGH_PERFORMANCE_MATCH');
    } else if (perfStatus === 'YELLOW') {
      score += 10;
    }

    // Check capacity
    const openJobsToday = this.countOpenJobsForDate(subcontractor.assignments, targetDate);
    const maxConcurrent = subcontractor.maxConcurrentJobs || 1;

    if (openJobsToday >= maxConcurrent) {
      // At capacity, exclude
      return null;
    }

    if (openJobsToday < maxConcurrent - 1) {
      score += 20;
      reasons.push('CAPACITY_AVAILABLE');
    }

    // Check risk match (prefer high-performing subs for high-risk jobs)
    const jobRisk = job.riskSnapshot?.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | null;
    if (jobRisk === 'LOW' || jobRisk === 'MEDIUM') {
      score += 10;
      reasons.push('LOW_RISK_MATCH');
    }

    // Service area match (if data available)
    if (
      subcontractor.homeBaseCity &&
      job.city &&
      subcontractor.homeBaseCity.toLowerCase() === job.city.toLowerCase()
    ) {
      score += 15;
      reasons.push('SERVICE_AREA_MATCH');
    }

    // Determine confidence based on score
    let confidence: DispatchRecommendationConfidence;
    if (score >= 80) {
      confidence = 'HIGH';
    } else if (score >= 60) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    if (reasons.length === 0) {
      reasons.push('OTHER');
    }

    return {
      subcontractorId: subcontractor.id,
      subcontractorName: subcontractor.name,
      performanceStatus: perfStatus || undefined,
      isCompliant,
      distanceKm: null, // Would require geocoding
      openJobsToday,
      maxConcurrentJobs: maxConcurrent,
      reasons,
      confidence,
    };
  }

  /**
   * Count open jobs for a subcontractor on a specific date
   */
  private countOpenJobsForDate(assignments: any[], targetDate: Date): number {
    const targetDateStr = targetDate.toISOString().split('T')[0];

    return assignments.filter((assignment) => {
      const job = assignment.job;
      if (!job) return false;

      // Check if job is scheduled for target date
      if (job.scheduledDate) {
        const jobDateStr = new Date(job.scheduledDate).toISOString().split('T')[0];
        if (jobDateStr === targetDateStr) {
          return true;
        }
      }

      // Or if job is in progress on that date (approximation)
      const activeStatuses = ['SCHEDULED', 'IN_PROGRESS'];
      return activeStatuses.includes(job.status);
    }).length;
  }

  /**
   * Compute materials ETA status for a job
   */
  private computeMaterialsEtaStatus(
    materialOrders: any[]
  ): 'ON_TRACK' | 'AT_RISK' | 'LATE' | 'UNKNOWN' {
    if (!materialOrders || materialOrders.length === 0) {
      return 'UNKNOWN';
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    let hasLate = false;
    let hasAtRisk = false;

    for (const order of materialOrders) {
      // Skip delivered orders
      if (order.status === 'DELIVERED') {
        continue;
      }

      // No expected delivery date
      if (!order.expectedDeliveryDate) {
        hasAtRisk = true;
        continue;
      }

      const expectedDate = new Date(order.expectedDeliveryDate);

      // Past expected date and not delivered
      if (expectedDate < now && order.status !== 'DELIVERED') {
        hasLate = true;
      }

      // Within 3 days
      if (expectedDate > now && expectedDate <= threeDaysFromNow) {
        hasAtRisk = true;
      }
    }

    if (hasLate) return 'LATE';
    if (hasAtRisk) return 'AT_RISK';
    return 'ON_TRACK';
  }
}
