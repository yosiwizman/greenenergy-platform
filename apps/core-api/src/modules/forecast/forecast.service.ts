import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import {
  startOfDay,
  addWeeks,
  startOfWeek,
  isBefore,
  isAfter,
  isWithinInterval,
  format,
} from 'date-fns';
import type {
  CashflowForecastDTO,
  CashflowPointDTO,
  PipelineForecastDTO,
  PipelineBucketDTO,
  ForecastOverviewDTO,
} from '@greenenergy/shared-types';

/**
 * ForecastingService - Phase 6 Sprint 1
 * Provides deterministic cashflow and pipeline forecasting for executives
 */
@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  // Pipeline status win probabilities (deterministic mapping)
  private readonly PIPELINE_STATUS_WEIGHTS: Record<
    string,
    { label: string; winProbability: number }
  > = {
    LEAD: { label: 'Lead', winProbability: 0.2 },
    QUALIFIED: { label: 'Qualified', winProbability: 0.3 },
    SITE_SURVEY: { label: 'Site Survey', winProbability: 0.4 },
    DESIGN: { label: 'Design', winProbability: 0.5 },
    PERMITTING: { label: 'Permitting', winProbability: 0.6 },
    APPROVED: { label: 'Approved', winProbability: 0.7 },
    SCHEDULED: { label: 'Scheduled', winProbability: 0.85 },
    IN_PROGRESS: { label: 'In Progress', winProbability: 0.95 },
  };

  /**
   * Get cashflow forecast for the next N weeks
   * Based on open invoices and their due dates
   */
  async getCashflowForecast(horizonWeeks = 12): Promise<CashflowForecastDTO> {
    this.logger.log(`Generating cashflow forecast for ${horizonWeeks} weeks`);

    const today = startOfDay(new Date());
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

    // Initialize weekly buckets
    const points: CashflowPointDTO[] = [];
    for (let i = 0; i < horizonWeeks; i++) {
      const bucketDate = addWeeks(weekStart, i + 1); // Week ending
      points.push({
        date: format(bucketDate, 'yyyy-MM-dd'),
        expectedInflow: 0,
        invoiceCount: 0,
        overduePortion: 0,
      });
    }

    // Fetch all open invoices with outstanding balance
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [{ status: 'OPEN' }, { balance: { gt: 0 } }],
      },
      select: {
        id: true,
        balance: true,
        dueDate: true,
        status: true,
      },
    });

    this.logger.log(`Found ${invoices.length} open invoices`);

    // Assign invoices to buckets based on due date
    for (const invoice of invoices) {
      const balance = invoice.balance ? Number(invoice.balance) : 0;
      if (balance <= 0) continue;

      const dueDate = invoice.dueDate ? startOfDay(new Date(invoice.dueDate)) : null;

      if (!dueDate) {
        // No due date - assign to first bucket
        points[0]!.expectedInflow += balance;
        points[0]!.invoiceCount++;
        continue;
      }

      // Check if overdue (past due)
      if (isBefore(dueDate, today)) {
        // Overdue - assign to first bucket with overdue flag
        points[0]!.expectedInflow += balance;
        points[0]!.invoiceCount++;
        points[0]!.overduePortion += balance;
      } else {
        // Find the appropriate future bucket
        let assigned = false;
        for (let i = 0; i < points.length; i++) {
          const bucketDate = addWeeks(weekStart, i + 1);
          const prevBucketDate = i === 0 ? today : addWeeks(weekStart, i);

          if (
            isWithinInterval(dueDate, {
              start: prevBucketDate,
              end: bucketDate,
            }) ||
            (i === points.length - 1 && isAfter(dueDate, prevBucketDate))
          ) {
            points[i]!.expectedInflow += balance;
            points[i]!.invoiceCount++;
            assigned = true;
            break;
          }
        }

        // If beyond horizon, ignore for this forecast
        if (!assigned) {
          this.logger.debug(`Invoice ${invoice.id} due date beyond forecast horizon`);
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      horizonWeeks,
      points,
    };
  }

  /**
   * Get pipeline forecast with weighted values by job status
   * Only includes jobs not fully completed and paid
   */
  async getPipelineForecast(): Promise<PipelineForecastDTO> {
    this.logger.log('Generating pipeline forecast');

    // Fetch jobs that are in pipeline (not completed/cancelled/lost)
    // and not fully paid
    const jobs = await prisma.job.findMany({
      where: {
        status: {
          notIn: ['COMPLETE', 'CANCELLED', 'LOST'],
        },
      },
      include: {
        financialSnapshot: {
          select: {
            contractAmount: true,
            arStatus: true,
          },
        },
      },
    });

    // Filter out fully paid jobs
    const pipelineJobs = jobs.filter((job) => job.financialSnapshot?.arStatus !== 'PAID');

    this.logger.log(`Found ${pipelineJobs.length} pipeline jobs`);

    // Aggregate by status
    const statusBuckets: Record<
      string,
      { jobs: number; totalAmount: number; winProbability: number }
    > = {};

    for (const job of pipelineJobs) {
      const status = job.status;
      const contractAmount = job.financialSnapshot?.contractAmount || 0;

      // Get win probability for this status
      const statusInfo = this.PIPELINE_STATUS_WEIGHTS[status];
      const winProbability = statusInfo?.winProbability || 0.15; // Default low probability for unknown statuses

      if (!statusBuckets[status]) {
        statusBuckets[status] = {
          jobs: 0,
          totalAmount: 0,
          winProbability,
        };
      }

      statusBuckets[status]!.jobs++;
      statusBuckets[status]!.totalAmount += contractAmount;
    }

    // Build bucket DTOs
    const buckets: PipelineBucketDTO[] = [];
    let totalPipelineAmount = 0;
    let totalWeightedAmount = 0;

    for (const [statusKey, data] of Object.entries(statusBuckets)) {
      const statusInfo = this.PIPELINE_STATUS_WEIGHTS[statusKey];
      const weightedAmount = data.totalAmount * data.winProbability;

      buckets.push({
        statusKey,
        statusLabel: statusInfo?.label || statusKey,
        winProbability: data.winProbability,
        jobsCount: data.jobs,
        totalAmount: data.totalAmount,
        weightedAmount,
      });

      totalPipelineAmount += data.totalAmount;
      totalWeightedAmount += weightedAmount;
    }

    // Sort by weighted amount descending
    buckets.sort((a, b) => b.weightedAmount - a.weightedAmount);

    return {
      generatedAt: new Date().toISOString(),
      totalPipelineAmount,
      totalWeightedAmount,
      buckets,
    };
  }

  /**
   * Get complete forecast overview (cashflow + pipeline)
   */
  async getForecastOverview(horizonWeeks = 12): Promise<ForecastOverviewDTO> {
    this.logger.log('Generating forecast overview');

    const cashflow = await this.getCashflowForecast(horizonWeeks);
    const pipeline = await this.getPipelineForecast();

    return {
      generatedAt: new Date().toISOString(),
      cashflow,
      pipeline,
    };
  }
}
