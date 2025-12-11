import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type {
  ArSummaryDTO,
  JobArDetailsDTO,
  PaymentDTO,
  JobArStatus,
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
}
