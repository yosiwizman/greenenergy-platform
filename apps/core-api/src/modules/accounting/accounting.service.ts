import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import { QuickbooksClient } from './quickbooks.client';
import type { JobFinancialSnapshot } from '@prisma/client';

/**
 * AccountingService handles syncing financial data from QuickBooks
 * to JobFinancialSnapshot records.
 */
@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private readonly quickbooksClient: QuickbooksClient) {}

  /**
   * Sync a single job's financial data from QuickBooks
   * Updates or creates JobFinancialSnapshot with real contract amount
   */
  async syncJobFromQuickbooks(jobId: string): Promise<JobFinancialSnapshot> {
    this.logger.log(`Syncing job ${jobId} from QuickBooks`);

    // Fetch job with existing snapshot
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

    // Check if job has a jobNimbusId to use as invoice lookup
    if (!job.jobNimbusId) {
      this.logger.warn(`Job ${jobId} has no jobNimbusId, cannot sync from QuickBooks`);

      // If snapshot exists, just ensure it's marked as PLACEHOLDER
      if (job.financialSnapshot) {
        const updated = await prisma.jobFinancialSnapshot.update({
          where: { jobId },
          data: {
            accountingSource: 'PLACEHOLDER',
          },
        });
        return updated;
      }

      // Create a placeholder snapshot
      return this.createPlaceholderSnapshot(jobId, job);
    }

    // Try to fetch invoice from QuickBooks
    const invoice = await this.quickbooksClient.fetchInvoiceByJobNumber(job.jobNimbusId);

    if (!invoice) {
      this.logger.debug(`No QuickBooks invoice found for job ${jobId} (jobNumber: ${job.jobNimbusId})`);

      // If snapshot exists, mark as PLACEHOLDER; otherwise create one
      if (job.financialSnapshot) {
        const updated = await prisma.jobFinancialSnapshot.update({
          where: { jobId },
          data: {
            accountingSource: 'PLACEHOLDER',
          },
        });
        return updated;
      }

      return this.createPlaceholderSnapshot(jobId, job);
    }

    // Invoice found! Use its TotalAmt as contractAmount
    this.logger.log(`Found QuickBooks invoice for job ${jobId}: ${invoice.DocNumber} - $${invoice.TotalAmt}`);

    const contractAmount = invoice.TotalAmt;
    const accountingSource = 'QUICKBOOKS';
    const accountingLastSyncAt = new Date();

    // Preserve existing cost data if snapshot exists
    const estimatedCost = job.financialSnapshot?.estimatedCost ?? null;
    const actualCost = job.financialSnapshot?.actualCost ?? null;
    const changeOrdersAmount = job.financialSnapshot?.changeOrdersAmount ?? null;

    // Compute margin
    let marginAmount: number | null = null;
    let marginPercent: number | null = null;

    if (actualCost !== null && contractAmount > 0) {
      marginAmount = contractAmount - actualCost;
      marginPercent = (marginAmount / contractAmount) * 100;
    } else if (estimatedCost !== null && contractAmount > 0) {
      marginAmount = contractAmount - estimatedCost;
      marginPercent = (marginAmount / contractAmount) * 100;
    }

    // Get risk level
    const riskLevel = job.riskSnapshot?.riskLevel || null;
    const schedulingRisk = job.financialSnapshot?.schedulingRisk ?? null;

    // Sync payments for this invoice (Phase 5 Sprint 1)
    const payments = await this.quickbooksClient.fetchPaymentsForInvoice(invoice.Id);
    await this.syncPaymentsForJob(jobId, invoice.Id, payments);

    // Compute AR fields
    const amountPaid = payments.reduce((sum, p) => sum + p.TotalAmt, 0);
    const amountOutstanding = Math.max(0, contractAmount - amountPaid);
    const invoiceDueDate = invoice.DueDate ? new Date(invoice.DueDate) : null;
    const lastPaymentAt =
      payments.length > 0
        ? new Date(Math.max(...payments.map((p) => new Date(p.TxnDate).getTime())))
        : null;
    const arStatus = this.computeArStatus(amountPaid, amountOutstanding, invoiceDueDate);

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
        amountPaid,
        amountOutstanding,
        arStatus,
        invoiceDueDate,
        lastPaymentAt,
      },
      update: {
        contractAmount,
        marginAmount,
        marginPercent,
        accountingSource,
        accountingLastSyncAt,
        riskLevel,
        amountPaid,
        amountOutstanding,
        arStatus,
        invoiceDueDate,
        lastPaymentAt,
      },
    });

    this.logger.log(`Synced job ${jobId} from QuickBooks: contractAmount=$${contractAmount}`);

    return snapshot;
  }

  /**
   * Sync all active jobs from QuickBooks
   * Processes jobs sequentially with error handling per job
   */
  async syncAllActiveJobsFromQuickbooks(): Promise<void> {
    this.logger.log('Starting sync of all active jobs from QuickBooks');

    // Get all active jobs (not in terminal states)
    const jobs = await prisma.job.findMany({
      where: {
        status: {
          notIn: ['COMPLETE', 'CANCELLED', 'LOST'],
        },
      },
      select: {
        id: true,
        jobNimbusId: true,
      },
    });

    this.logger.log(`Found ${jobs.length} active jobs to sync from QuickBooks`);

    let successCount = 0;
    let errorCount = 0;

    for (const job of jobs) {
      try {
        await this.syncJobFromQuickbooks(job.id);
        successCount++;
      } catch (error: any) {
        this.logger.error(`Failed to sync job ${job.id} from QuickBooks:`, error.message);
        errorCount++;
      }
    }

    this.logger.log(
      `Finished syncing all jobs from QuickBooks: ${successCount} succeeded, ${errorCount} failed`,
    );
  }

  /**
   * Sync payments from QuickBooks to database (Phase 5 Sprint 1)
   * Creates or updates Payment records for a given job and invoice
   */
  private async syncPaymentsForJob(
    jobId: string,
    invoiceId: string,
    qbPayments: any[],
  ): Promise<void> {
    this.logger.log(`Syncing ${qbPayments.length} payment(s) for job ${jobId}`);

    for (const qbPayment of qbPayments) {
      // Find the line item that links to this specific invoice
      const invoiceLineAmount =
        qbPayment.Line?.find((line: any) =>
          line.LinkedTxn?.some((txn: any) => txn.TxnId === invoiceId && txn.TxnType === 'Invoice'),
        )?.Amount || qbPayment.TotalAmt;

      await prisma.payment.upsert({
        where: { externalId: qbPayment.Id },
        create: {
          jobId,
          externalId: qbPayment.Id,
          externalInvoiceId: invoiceId,
          amount: invoiceLineAmount,
          receivedAt: new Date(qbPayment.TxnDate),
          paymentMethod: this.mapQuickbooksPaymentMethod(qbPayment.PaymentMethodRef?.name),
          status: 'APPLIED',
          referenceNumber: qbPayment.PaymentRefNum || null,
          notes: qbPayment.PrivateNote || null,
        },
        update: {
          amount: invoiceLineAmount,
          receivedAt: new Date(qbPayment.TxnDate),
          paymentMethod: this.mapQuickbooksPaymentMethod(qbPayment.PaymentMethodRef?.name),
          referenceNumber: qbPayment.PaymentRefNum || null,
          notes: qbPayment.PrivateNote || null,
        },
      });
    }
  }

  /**
   * Map QuickBooks payment method to our enum
   */
  private mapQuickbooksPaymentMethod(qbMethod?: string): string | null {
    if (!qbMethod) return null;

    const method = qbMethod.toUpperCase();
    if (method.includes('CHECK')) return 'CHECK';
    if (method.includes('CARD') || method.includes('CREDIT')) return 'CREDIT_CARD';
    if (method.includes('ACH') || method.includes('BANK')) return 'ACH';
    if (method.includes('WIRE')) return 'WIRE';
    return 'OTHER';
  }

  /**
   * Compute AR status based on payment amounts and due date
   */
  private computeArStatus(
    amountPaid: number,
    amountOutstanding: number,
    invoiceDueDate: Date | null,
  ): string {
    // OVERDUE takes precedence if due date is in the past
    if (invoiceDueDate && invoiceDueDate < new Date() && amountOutstanding > 0) {
      return 'OVERDUE';
    }

    // PAID: fully paid
    if (amountOutstanding <= 0) {
      return 'PAID';
    }

    // PARTIALLY_PAID: some payment made but still outstanding
    if (amountPaid > 0 && amountOutstanding > 0) {
      return 'PARTIALLY_PAID';
    }

    // UNPAID: no payment made
    return 'UNPAID';
  }

  /**
   * Create a placeholder snapshot for jobs without QuickBooks data
   */
  private async createPlaceholderSnapshot(jobId: string, job: any): Promise<JobFinancialSnapshot> {
    // Use systemSize-based placeholder if available
    const contractAmount = job.systemSize ? job.systemSize * 3.5 * 1000 : 10000;

    const snapshot = await prisma.jobFinancialSnapshot.upsert({
      where: { jobId },
      create: {
        jobId,
        contractAmount,
        estimatedCost: null,
        actualCost: null,
        marginAmount: null,
        marginPercent: null,
        changeOrdersAmount: null,
        riskLevel: job.riskSnapshot?.riskLevel || null,
        schedulingRisk: null,
        accountingSource: 'PLACEHOLDER',
        accountingLastSyncAt: null,
        amountPaid: 0,
        amountOutstanding: contractAmount,
        arStatus: 'UNPAID',
        invoiceDueDate: null,
        lastPaymentAt: null,
      },
      update: {
        accountingSource: 'PLACEHOLDER',
      },
    });

    return snapshot;
  }
}
