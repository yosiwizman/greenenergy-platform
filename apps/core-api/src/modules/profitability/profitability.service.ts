import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type {
  JobProfitabilityDTO,
  JobProfitabilityLevel,
  ProfitDashboardSummaryDTO,
  ProfitDashboardJobFilter,
} from '@greenenergy/shared-types';

@Injectable()
export class ProfitabilityService {
  private readonly logger = new Logger(ProfitabilityService.name);

  /**
   * Get financial snapshot for a single job
   */
  async getJobFinancialSnapshot(jobId: string): Promise<JobProfitabilityDTO> {
    this.logger.log(`Getting financial snapshot for job: ${jobId}`);

    // Recalculate to ensure fresh data
    return this.recalculateJobFinancialSnapshot(jobId);
  }

  /**
   * Get dashboard summary with aggregated metrics
   */
  async getProfitDashboardSummary(): Promise<ProfitDashboardSummaryDTO> {
    this.logger.log('Computing profit dashboard summary');

    const snapshots = await prisma.jobFinancialSnapshot.findMany({
      include: {
        job: {
          select: {
            status: true,
          },
        },
      },
    });

    if (snapshots.length === 0) {
      return {
        totalJobs: 0,
        totalContractAmount: 0,
        totalMarginAmount: 0,
        averageMarginPercent: null,
        lowMarginJobCount: 0,
        mediumMarginJobCount: 0,
        highMarginJobCount: 0,
        highRiskAndLowMarginJobCount: 0,
      };
    }

    let totalContractAmount = 0;
    let totalMarginAmount = 0;
    let marginPercentSum = 0;
    let marginPercentCount = 0;

    let lowMarginJobCount = 0;
    let mediumMarginJobCount = 0;
    let highMarginJobCount = 0;
    let highRiskAndLowMarginJobCount = 0;

    for (const snapshot of snapshots) {
      totalContractAmount += snapshot.contractAmount;

      if (snapshot.marginAmount !== null) {
        totalMarginAmount += snapshot.marginAmount;
      }

      if (snapshot.marginPercent !== null) {
        marginPercentSum += snapshot.marginPercent;
        marginPercentCount++;
      }

      const profitabilityLevel = this.computeProfitabilityLevel(snapshot.marginPercent);

      if (profitabilityLevel === 'LOW') {
        lowMarginJobCount++;
        if (snapshot.riskLevel === 'HIGH') {
          highRiskAndLowMarginJobCount++;
        }
      } else if (profitabilityLevel === 'MEDIUM') {
        mediumMarginJobCount++;
      } else if (profitabilityLevel === 'HIGH') {
        highMarginJobCount++;
      }
    }

    const averageMarginPercent =
      marginPercentCount > 0 ? marginPercentSum / marginPercentCount : null;

    return {
      totalJobs: snapshots.length,
      totalContractAmount,
      totalMarginAmount,
      averageMarginPercent,
      lowMarginJobCount,
      mediumMarginJobCount,
      highMarginJobCount,
      highRiskAndLowMarginJobCount,
    };
  }

  /**
   * List job financial snapshots with optional filtering
   */
  async listJobFinancialSnapshots(
    filter?: ProfitDashboardJobFilter,
  ): Promise<JobProfitabilityDTO[]> {
    this.logger.log('Listing job financial snapshots with filter:', filter);

    const snapshots = await prisma.jobFinancialSnapshot.findMany({
      include: {
        job: {
          select: {
            id: true,
            jobNimbusId: true,
            customerName: true,
            status: true,
          },
        },
      },
      take: 500, // Reasonable limit for v1
      orderBy: {
        contractAmount: 'desc',
      },
    });

    let results = snapshots.map((snapshot) => this.snapshotToDTO(snapshot));

    // Apply filters
    if (filter?.profitabilityLevel) {
      results = results.filter((dto) => dto.profitabilityLevel === filter.profitabilityLevel);
    }

    if (filter?.riskLevel) {
      results = results.filter((dto) => dto.riskLevel === filter.riskLevel);
    }

    return results;
  }

  /**
   * Recalculate financial snapshot for a single job
   * NOTE: If accountingSource is QUICKBOOKS, contractAmount is NOT overwritten
   */
  async recalculateJobFinancialSnapshot(jobId: string): Promise<JobProfitabilityDTO> {
    this.logger.log(`Recalculating financial snapshot for job: ${jobId}`);

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        financialSnapshot: true,
        riskSnapshot: {
          select: {
            riskLevel: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    // Check if existing snapshot has QuickBooks data
    const hasQuickbooksData =
      job.financialSnapshot?.accountingSource === 'QUICKBOOKS';

    // Determine contractAmount:
    // - If QuickBooks data exists, preserve it
    // - Otherwise, use placeholder logic
    let contractAmount: number;
    if (hasQuickbooksData && job.financialSnapshot) {
      contractAmount = job.financialSnapshot.contractAmount;
      this.logger.debug(
        `Preserving QuickBooks contractAmount: $${contractAmount} for job ${jobId}`,
      );
    } else {
      // For v1, use systemSize as a placeholder for contract amount if available
      contractAmount = job.systemSize ? job.systemSize * 3.5 * 1000 : 10000; // placeholder: $3.50/W
    }

    // For v1, leave costs as null unless provided
    const estimatedCost = null;
    const actualCost = null;

    // Compute margin based on available data
    let marginAmount: number | null = null;
    let marginPercent: number | null = null;

    if (actualCost !== null && contractAmount > 0) {
      marginAmount = contractAmount - actualCost;
      marginPercent = (marginAmount / contractAmount) * 100;
    } else if (estimatedCost !== null && contractAmount > 0) {
      marginAmount = contractAmount - estimatedCost;
      marginPercent = (marginAmount / contractAmount) * 100;
    }

    const changeOrdersAmount = null; // v1: not tracked yet

    // Get risk level
    const riskLevel = job.riskSnapshot?.riskLevel || null;

    // For scheduling risk, we'd query scheduling data but for v1 keep it simple
    const schedulingRisk = null;

    // Determine accountingSource:
    // - If we just used QuickBooks data, preserve that flag
    // - Otherwise, mark as PLACEHOLDER
    const accountingSource = hasQuickbooksData ? 'QUICKBOOKS' : 'PLACEHOLDER';
    const accountingLastSyncAt = hasQuickbooksData
      ? job.financialSnapshot?.accountingLastSyncAt ?? null
      : null;

    // Upsert snapshot
    const snapshot = await prisma.jobFinancialSnapshot.upsert({
      where: { jobId },
      create: {
        jobId,
        contractAmount,
        estimatedCost,
        actualCost,
        marginAmount,
        marginPercent,
        changeOrdersAmount,
        riskLevel,
        schedulingRisk,
        accountingSource,
        accountingLastSyncAt,
      },
      update: {
        // Only update contractAmount if NOT from QuickBooks
        ...(hasQuickbooksData ? {} : { contractAmount }),
        estimatedCost,
        actualCost,
        marginAmount,
        marginPercent,
        changeOrdersAmount,
        riskLevel,
        schedulingRisk,
        // Preserve accounting metadata if QuickBooks
        ...(hasQuickbooksData ? {} : { accountingSource, accountingLastSyncAt }),
      },
    });

    return this.snapshotToDTO({
      ...snapshot,
      job: {
        id: job.id,
        jobNimbusId: job.jobNimbusId,
        customerName: job.customerName,
        status: job.status,
      },
    });
  }

  /**
   * Recalculate all job snapshots
   */
  async recalculateAllSnapshots(): Promise<void> {
    this.logger.log('Recalculating all job financial snapshots');

    // Get all active jobs (not in terminal states)
    const jobs = await prisma.job.findMany({
      where: {
        status: {
          notIn: ['COMPLETE', 'CANCELLED', 'LOST'],
        },
      },
      select: {
        id: true,
      },
    });

    this.logger.log(`Found ${jobs.length} active jobs to recalculate`);

    for (const job of jobs) {
      try {
        await this.recalculateJobFinancialSnapshot(job.id);
      } catch (error) {
        this.logger.error(`Failed to recalculate snapshot for job ${job.id}:`, error);
      }
    }

    this.logger.log('Finished recalculating all snapshots');
  }

  /**
   * Convert snapshot to DTO
   */
  private snapshotToDTO(snapshot: any): JobProfitabilityDTO {
    const profitabilityLevel = this.computeProfitabilityLevel(snapshot.marginPercent);

    return {
      jobId: snapshot.job.id,
      jobNumber: snapshot.job.jobNimbusId,
      customerName: snapshot.job.customerName,
      status: snapshot.job.status,
      contractAmount: snapshot.contractAmount,
      estimatedCost: snapshot.estimatedCost,
      actualCost: snapshot.actualCost,
      marginAmount: snapshot.marginAmount,
      marginPercent: snapshot.marginPercent,
      changeOrdersAmount: snapshot.changeOrdersAmount,
      profitabilityLevel,
      riskLevel: snapshot.riskLevel,
      schedulingRisk: snapshot.schedulingRisk,
      accountingSource: snapshot.accountingSource || null,
      accountingLastSyncAt: snapshot.accountingLastSyncAt
        ? snapshot.accountingLastSyncAt.toISOString()
        : null,
    };
  }

  /**
   * Compute profitability level based on margin percent
   * Thresholds:
   * - marginPercent < 10 → LOW
   * - 10 ≤ marginPercent < 25 → MEDIUM
   * - marginPercent ≥ 25 → HIGH
   * - null or undefined → MEDIUM (default)
   */
  private computeProfitabilityLevel(marginPercent: number | null): JobProfitabilityLevel {
    if (marginPercent === null || marginPercent === undefined) {
      return 'MEDIUM';
    }

    if (marginPercent < 10) {
      return 'LOW';
    } else if (marginPercent < 25) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }
}
