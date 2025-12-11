import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type {
  CommandCenterOverviewDTO,
  CommandCenterSummaryDTO,
  CommandCenterRoleViewDTO,
  CommandCenterJobAttentionDTO,
} from '@greenenergy/shared-types';

/**
 * CommandCenterService aggregates data from multiple modules
 * to provide a high-level operational overview
 */
@Injectable()
export class CommandCenterService {
  private readonly logger = new Logger(CommandCenterService.name);

  /**
   * Get complete command center overview
   */
  async getOverview(): Promise<CommandCenterOverviewDTO> {
    this.logger.log('Computing command center overview');

    const [summary, roleViews, jobsNeedingAttention] = await Promise.all([
      this.computeSummary(),
      this.computeRoleViews(),
      this.getJobsNeedingAttention(),
    ]);

    return {
      summary,
      roleViews,
      jobsNeedingAttention,
    };
  }

  /**
   * Compute top-level summary metrics
   */
  private async computeSummary(): Promise<CommandCenterSummaryDTO> {
    // Jobs in progress (not CANCELLED or COMPLETE)
    const jobsInProgress = await prisma.job.count({
      where: {
        status: {
          notIn: ['CANCELLED', 'COMPLETE'],
        },
      },
    });

    // Jobs with HIGH risk
    const jobsHighRisk = await prisma.jobRiskSnapshot.count({
      where: {
        riskLevel: 'HIGH',
      },
    });

    // Jobs with scheduling risk (HIGH)
    const jobsAtRiskSchedule = await prisma.jobFinancialSnapshot.count({
      where: {
        schedulingRisk: 'HIGH',
      },
    });

    // Open safety incidents
    const openSafetyIncidents = await prisma.safetyIncident.count({
      where: {
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
    });

    // Subcontractors by performanceStatus
    const subs = await prisma.subcontractor.groupBy({
      by: ['performanceStatus'],
      _count: true,
    });

    const subsGreen = subs.find((s) => s.performanceStatus === 'GREEN')?._count || 0;
    const subsYellow = subs.find((s) => s.performanceStatus === 'YELLOW')?._count || 0;
    const subsRed = subs.find((s) => s.performanceStatus === 'RED')?._count || 0;

    // Warranties expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const warrantiesExpiringSoon = await prisma.warranty.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: thirtyDaysFromNow,
        },
      },
    });

    // Material orders delayed
    const materialOrdersDelayed = await prisma.materialOrder.count({
      where: {
        status: {
          in: ['ORDERED', 'SHIPPED'],
        },
        expectedDeliveryDate: {
          lt: new Date(),
        },
      },
    });

    // Low-margin high-risk jobs
    const lowMarginHighRiskJobs = await prisma.jobFinancialSnapshot.count({
      where: {
        marginPercent: {
          lt: 10,
        },
        riskLevel: 'HIGH',
      },
    });

    // Workflow actions in last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const workflowActionsLast24h = await prisma.workflowActionLog.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
    });

    return {
      jobsInProgress,
      jobsHighRisk,
      jobsAtRiskSchedule,
      openSafetyIncidents,
      subsGreen,
      subsYellow,
      subsRed,
      warrantiesExpiringSoon,
      materialOrdersDelayed,
      lowMarginHighRiskJobs,
      workflowActionsLast24h,
    };
  }

  /**
   * Compute role-specific views
   */
  private async computeRoleViews(): Promise<CommandCenterRoleViewDTO> {
    // Executive view
    const totalJobs = await prisma.job.count();
    const jobsInProgress = await prisma.job.count({
      where: {
        status: {
          notIn: ['CANCELLED', 'COMPLETE'],
        },
      },
    });
    const jobsHighRisk = await prisma.jobRiskSnapshot.count({
      where: {
        riskLevel: 'HIGH',
      },
    });

    // Average margin percent from financial snapshots
    const marginData = await prisma.jobFinancialSnapshot.aggregate({
      _avg: {
        marginPercent: true,
      },
    });
    const avgMarginPercent = marginData._avg.marginPercent;

    // Production view
    const jobsWithQcIssues = await prisma.qCPhotoCheck.count({
      where: {
        status: 'FAIL',
      },
    });

    const jobsWithDelayedMaterials = await prisma.materialOrder.count({
      where: {
        status: {
          in: ['ORDERED', 'SHIPPED'],
        },
        expectedDeliveryDate: {
          lt: new Date(),
        },
      },
    });

    const jobsWithSchedulingRisk = await prisma.jobFinancialSnapshot.count({
      where: {
        schedulingRisk: {
          in: ['MEDIUM', 'HIGH'],
        },
      },
    });

    // Safety view
    const openIncidents = await prisma.safetyIncident.count({
      where: {
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
    });

    const highSeverityIncidents = await prisma.safetyIncident.count({
      where: {
        severity: {
          in: ['HIGH', 'CRITICAL'],
        },
        status: {
          notIn: ['RESOLVED', 'CLOSED'],
        },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const incidentsLast30Days = await prisma.safetyIncident.count({
      where: {
        occurredAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Finance view
    const lowMarginJobs = await prisma.jobFinancialSnapshot.count({
      where: {
        marginPercent: {
          lt: 10,
        },
      },
    });

    const lowMarginHighRiskJobs = await prisma.jobFinancialSnapshot.count({
      where: {
        marginPercent: {
          lt: 10,
        },
        riskLevel: 'HIGH',
      },
    });

    const contractData = await prisma.jobFinancialSnapshot.aggregate({
      _sum: {
        contractAmount: true,
      },
    });
    const totalContractAmount = contractData._sum.contractAmount;

    return {
      executive: {
        totalJobs,
        jobsInProgress,
        jobsHighRisk,
        avgMarginPercent,
      },
      production: {
        jobsWithQcIssues,
        jobsWithDelayedMaterials,
        jobsWithSchedulingRisk,
      },
      safety: {
        openIncidents,
        highSeverityIncidents,
        incidentsLast30Days,
      },
      finance: {
        lowMarginJobs,
        lowMarginHighRiskJobs,
        totalContractAmount,
      },
    };
  }

  /**
   * Get jobs that need immediate attention
   */
  async getJobsNeedingAttention(): Promise<CommandCenterJobAttentionDTO[]> {
    this.logger.log('Finding jobs needing attention');

    // Get jobs with various issues
    const jobsWithIssues = await prisma.job.findMany({
      where: {
        status: {
          notIn: ['CANCELLED', 'COMPLETE'],
        },
      },
      include: {
        riskSnapshot: true,
        qcPhotoChecks: {
          where: {
            status: 'FAIL',
          },
          take: 1,
        },
        financialSnapshot: true,
        safetyIncidents: {
          where: {
            status: {
              notIn: ['RESOLVED', 'CLOSED'],
            },
          },
          take: 1,
        },
        materialOrders: {
          where: {
            status: {
              in: ['ORDERED', 'SHIPPED'],
            },
            expectedDeliveryDate: {
              lt: new Date(),
            },
          },
          take: 1,
        },
        warranties: {
          where: {
            status: 'ACTIVE',
            endDate: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
          },
          take: 1,
        },
      },
      take: 100, // Limit for performance
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Filter to jobs that have at least one issue
    const jobsNeedingAttention = jobsWithIssues
      .map((job) => {
        const hasQcFail = job.qcPhotoChecks.length > 0;
        const hasOpenSafetyIncident = job.safetyIncidents.length > 0;
        const hasDelayedMaterials = job.materialOrders.length > 0;
        const hasExpiringWarranty = job.warranties.length > 0;
        const isLowMarginHighRisk =
          (job.financialSnapshot?.marginPercent || 0) < 10 &&
          job.riskSnapshot?.riskLevel === 'HIGH';

        // Only include if job has at least one issue
        if (
          !hasQcFail &&
          !hasOpenSafetyIncident &&
          !hasDelayedMaterials &&
          !hasExpiringWarranty &&
          !isLowMarginHighRisk
        ) {
          return null;
        }

        const dto: CommandCenterJobAttentionDTO = {
          jobId: job.id,
          customerName: job.customerName,
          status: job.status,
          riskLevel: job.riskSnapshot?.riskLevel || null,
          hasQcFail,
          hasOpenSafetyIncident,
          hasDelayedMaterials,
          hasExpiringWarranty,
          isLowMarginHighRisk,
          lastUpdatedAt: job.updatedAt.toISOString(),
        };

        return dto;
      })
      .filter((dto): dto is CommandCenterJobAttentionDTO => dto !== null);

    this.logger.log(`Found ${jobsNeedingAttention.length} jobs needing attention`);

    return jobsNeedingAttention;
  }
}
