import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import { differenceInCalendarDays } from 'date-fns';
import { ArAgingBucket } from '@greenenergy/shared-types';
import type {
  ArSummaryDTO,
  JobArDetailsDTO,
  PaymentDTO,
  JobArStatus,
  ArAgingSummaryDTO,
  ArAgingBucketData,
  InvoiceDTO,
} from '@greenenergy/shared-types';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  /**
   * Get AR summary across all jobs
   */
  async getArSummary(): Promise<ArSummaryDTO> {
    this.logger.log('Computing AR summary');

    const snapshots = await prisma.jobFinancialSnapshot.findMany({
      select: {
        contractAmount: true,
        amountPaid: true,
        amountOutstanding: true,
        arStatus: true,
      },
    });

    if (snapshots.length === 0) {
      return {
        totalOutstanding: 0,
        totalPaid: 0,
        totalContractValue: 0,
        jobsPaid: 0,
        jobsPartiallyPaid: 0,
        jobsUnpaid: 0,
        jobsOverdue: 0,
      };
    }

    let totalContractValue = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let jobsPaid = 0;
    let jobsPartiallyPaid = 0;
    let jobsUnpaid = 0;
    let jobsOverdue = 0;

    for (const snapshot of snapshots) {
      totalContractValue += snapshot.contractAmount;
      totalPaid += snapshot.amountPaid || 0;
      totalOutstanding += snapshot.amountOutstanding || 0;

      const status = snapshot.arStatus;
      if (status === 'PAID') {
        jobsPaid++;
      } else if (status === 'PARTIALLY_PAID') {
        jobsPartiallyPaid++;
      } else if (status === 'UNPAID') {
        jobsUnpaid++;
      } else if (status === 'OVERDUE') {
        jobsOverdue++;
      }
    }

    return {
      totalOutstanding,
      totalPaid,
      totalContractValue,
      jobsPaid,
      jobsPartiallyPaid,
      jobsUnpaid,
      jobsOverdue,
    };
  }

  /**
   * List all jobs with AR details
   * Optional filtering by AR status
   */
  async listJobsWithArDetails(statusFilter?: JobArStatus): Promise<JobArDetailsDTO[]> {
    this.logger.log(`Listing jobs with AR details, filter: ${statusFilter || 'none'}`);

    const where = statusFilter ? { arStatus: statusFilter } : {};

    const snapshots = await prisma.jobFinancialSnapshot.findMany({
      where,
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
      orderBy: {
        amountOutstanding: 'desc',
      },
      take: 500,
    });

    const results: JobArDetailsDTO[] = [];

    for (const snapshot of snapshots) {
      // Fetch payments for this job
      const payments = await prisma.payment.findMany({
        where: { jobId: snapshot.jobId },
        orderBy: { receivedAt: 'desc' },
      });

      results.push({
        jobId: snapshot.jobId,
        jobNumber: snapshot.job.jobNimbusId || null,
        customerName: snapshot.job.customerName || null,
        status: snapshot.job.status,
        contractAmount: snapshot.contractAmount,
        amountPaid: snapshot.amountPaid || 0,
        amountOutstanding: snapshot.amountOutstanding || 0,
        arStatus: snapshot.arStatus as JobArStatus,
        lastPaymentAt: snapshot.lastPaymentAt?.toISOString() || null,
        invoiceDueDate: snapshot.invoiceDueDate?.toISOString() || null,
        payments: payments.map((p) => this.mapPaymentToDTO(p)),
      });
    }

    return results;
  }

  /**
   * Get AR details for a specific job
   */
  async getJobArDetails(jobId: string): Promise<JobArDetailsDTO> {
    this.logger.log(`Getting AR details for job: ${jobId}`);

    const snapshot = await prisma.jobFinancialSnapshot.findUnique({
      where: { jobId },
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
    });

    if (!snapshot) {
      throw new NotFoundException(`Financial snapshot for job ${jobId} not found`);
    }

    const payments = await prisma.payment.findMany({
      where: { jobId },
      orderBy: { receivedAt: 'desc' },
    });

    return {
      jobId: snapshot.jobId,
      jobNumber: snapshot.job.jobNimbusId || null,
      customerName: snapshot.job.customerName || null,
      status: snapshot.job.status,
      contractAmount: snapshot.contractAmount,
      amountPaid: snapshot.amountPaid || 0,
      amountOutstanding: snapshot.amountOutstanding || 0,
      arStatus: snapshot.arStatus as JobArStatus,
      lastPaymentAt: snapshot.lastPaymentAt?.toISOString() || null,
      invoiceDueDate: snapshot.invoiceDueDate?.toISOString() || null,
      payments: payments.map((p) => this.mapPaymentToDTO(p)),
    };
  }

  /**
   * Get AR aging summary with buckets (Phase 5 Sprint 2)
   */
  async getArAgingSummary(): Promise<ArAgingSummaryDTO> {
    this.logger.log('Computing AR aging summary');

    const now = new Date();

    // Fetch all jobs with outstanding amounts
    const snapshots = await prisma.jobFinancialSnapshot.findMany({
      where: {
        amountOutstanding: {
          gt: 0,
        },
      },
      select: {
        jobId: true,
        amountOutstanding: true,
        invoiceDueDate: true,
      },
    });

    // Initialize bucket counters
    const bucketData: Record<ArAgingBucket, { outstanding: number; jobsCount: number }> = {
      [ArAgingBucket.CURRENT]: { outstanding: 0, jobsCount: 0 },
      [ArAgingBucket.DAYS_1_30]: { outstanding: 0, jobsCount: 0 },
      [ArAgingBucket.DAYS_31_60]: { outstanding: 0, jobsCount: 0 },
      [ArAgingBucket.DAYS_61_90]: { outstanding: 0, jobsCount: 0 },
      [ArAgingBucket.DAYS_91_PLUS]: { outstanding: 0, jobsCount: 0 },
    };

    let totalOutstanding = 0;

    // Process each job and assign to bucket
    for (const snapshot of snapshots) {
      const outstanding = snapshot.amountOutstanding || 0;
      if (outstanding <= 0) continue;

      totalOutstanding += outstanding;

      const bucket = this.computeAgingBucket(snapshot.invoiceDueDate, now);
      bucketData[bucket].outstanding += outstanding;
      bucketData[bucket].jobsCount++;
    }

    // Convert to array format
    const buckets: ArAgingBucketData[] = [
      {
        bucket: ArAgingBucket.CURRENT,
        outstanding: bucketData[ArAgingBucket.CURRENT].outstanding,
        jobsCount: bucketData[ArAgingBucket.CURRENT].jobsCount,
      },
      {
        bucket: ArAgingBucket.DAYS_1_30,
        outstanding: bucketData[ArAgingBucket.DAYS_1_30].outstanding,
        jobsCount: bucketData[ArAgingBucket.DAYS_1_30].jobsCount,
      },
      {
        bucket: ArAgingBucket.DAYS_31_60,
        outstanding: bucketData[ArAgingBucket.DAYS_31_60].outstanding,
        jobsCount: bucketData[ArAgingBucket.DAYS_31_60].jobsCount,
      },
      {
        bucket: ArAgingBucket.DAYS_61_90,
        outstanding: bucketData[ArAgingBucket.DAYS_61_90].outstanding,
        jobsCount: bucketData[ArAgingBucket.DAYS_61_90].jobsCount,
      },
      {
        bucket: ArAgingBucket.DAYS_91_PLUS,
        outstanding: bucketData[ArAgingBucket.DAYS_91_PLUS].outstanding,
        jobsCount: bucketData[ArAgingBucket.DAYS_91_PLUS].jobsCount,
      },
    ];

    return {
      generatedAt: now.toISOString(),
      totalOutstanding,
      buckets,
    };
  }

  /**
   * Compute which aging bucket a job belongs to based on invoice due date
   */
  private computeAgingBucket(invoiceDueDate: Date | null, now: Date): ArAgingBucket {
    // If no due date or not yet due, it's CURRENT
    if (!invoiceDueDate || invoiceDueDate >= now) {
      return ArAgingBucket.CURRENT;
    }

    const daysOverdue = differenceInCalendarDays(now, invoiceDueDate);

    if (daysOverdue <= 0) {
      return ArAgingBucket.CURRENT;
    } else if (daysOverdue >= 1 && daysOverdue <= 30) {
      return ArAgingBucket.DAYS_1_30;
    } else if (daysOverdue >= 31 && daysOverdue <= 60) {
      return ArAgingBucket.DAYS_31_60;
    } else if (daysOverdue >= 61 && daysOverdue <= 90) {
      return ArAgingBucket.DAYS_61_90;
    } else {
      return ArAgingBucket.DAYS_91_PLUS;
    }
  }

  /**
   * List all invoices for a job (Phase 5 Sprint 3)
   */
  async listInvoicesForJob(jobId: string): Promise<InvoiceDTO[]> {
    this.logger.log(`Listing invoices for job: ${jobId}`);

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const invoices = await prisma.invoice.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((invoice) => this.mapInvoiceToDTO(invoice));
  }

  /**
   * Get a specific invoice for a job (Phase 5 Sprint 3)
   */
  async getInvoiceForJob(jobId: string, invoiceId: string): Promise<InvoiceDTO | null> {
    this.logger.log(`Getting invoice ${invoiceId} for job: ${jobId}`);

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        jobId,
      },
    });

    if (!invoice) {
      return null;
    }

    return this.mapInvoiceToDTO(invoice);
  }

  /**
   * Map Prisma Payment to DTO
   */
  private mapPaymentToDTO(payment: any): PaymentDTO {
    return {
      id: payment.id,
      jobId: payment.jobId,
      externalId: payment.externalId,
      externalInvoiceId: payment.externalInvoiceId || null,
      amount: payment.amount,
      receivedAt: payment.receivedAt.toISOString(),
      paymentMethod: payment.paymentMethod || null,
      status: payment.status,
      referenceNumber: payment.referenceNumber || null,
      notes: payment.notes || null,
    };
  }

  /**
   * Map Prisma Invoice to DTO (Phase 5 Sprint 3)
   */
  private mapInvoiceToDTO(invoice: any): InvoiceDTO {
    return {
      id: invoice.id,
      jobId: invoice.jobId,
      externalId: invoice.externalId,
      number: invoice.number,
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
      totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : null,
      balance: invoice.balance ? Number(invoice.balance) : null,
      status: invoice.status,
      publicUrl: invoice.publicUrl,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }
}
