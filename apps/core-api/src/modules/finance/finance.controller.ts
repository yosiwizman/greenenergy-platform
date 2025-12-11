import { Controller, Get, Post, Query, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AccountingService } from '../accounting/accounting.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  ArSummaryDTO,
  JobArDetailsDTO,
  JobArStatus,
  ArAgingSummaryDTO,
  InvoiceDTO,
} from '@greenenergy/shared-types';

/**
 * Finance API Controller (Phase 5 Sprint 1)
 * Provides read-only AR and payment tracking endpoints
 */
@Controller('api/v1/finance')
@UseGuards(InternalApiKeyGuard)
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(
    private readonly financeService: FinanceService,
    private readonly accountingService: AccountingService
  ) {}

  /**
   * GET /api/v1/finance/ar/summary
   * Returns aggregated AR metrics across all jobs
   */
  @Get('ar/summary')
  async getArSummary(): Promise<ArSummaryDTO> {
    this.logger.log('GET /api/v1/finance/ar/summary');
    return this.financeService.getArSummary();
  }

  /**
   * GET /api/v1/finance/ar/jobs
   * Returns list of jobs with AR details
   * Optional query param: ?status=OVERDUE|UNPAID|PARTIALLY_PAID|PAID
   */
  @Get('ar/jobs')
  async listJobsWithArDetails(@Query('status') status?: JobArStatus): Promise<JobArDetailsDTO[]> {
    this.logger.log(`GET /api/v1/finance/ar/jobs?status=${status || ''}`);
    return this.financeService.listJobsWithArDetails(status);
  }

  /**
   * GET /api/v1/finance/ar/jobs/:jobId
   * Returns AR details for a specific job
   */
  @Get('ar/jobs/:jobId')
  async getJobArDetails(@Param('jobId') jobId: string): Promise<JobArDetailsDTO> {
    this.logger.log(`GET /api/v1/finance/ar/jobs/${jobId}`);
    return this.financeService.getJobArDetails(jobId);
  }

  /**
   * GET /api/v1/finance/ar/aging
   * Returns AR aging summary with buckets (Phase 5 Sprint 2)
   */
  @Get('ar/aging')
  async getArAgingSummary(): Promise<ArAgingSummaryDTO> {
    this.logger.log('GET /api/v1/finance/ar/aging');
    return this.financeService.getArAgingSummary();
  }

  /**
   * GET /api/v1/finance/ar/jobs/:jobId/invoices
   * Returns list of invoices for a job (Phase 5 Sprint 3)
   */
  @Get('ar/jobs/:jobId/invoices')
  async listInvoicesForJob(@Param('jobId') jobId: string): Promise<InvoiceDTO[]> {
    this.logger.log(`GET /api/v1/finance/ar/jobs/${jobId}/invoices`);
    return this.financeService.listInvoicesForJob(jobId);
  }

  /**
   * POST /api/v1/finance/ar/jobs/:jobId/invoices
   * Create an invoice for a job (Phase 5 Sprint 3)
   */
  @Post('ar/jobs/:jobId/invoices')
  async createInvoiceForJob(
    @Param('jobId') jobId: string,
    @Body() body: { sendEmail?: boolean }
  ): Promise<InvoiceDTO> {
    this.logger.log(`POST /api/v1/finance/ar/jobs/${jobId}/invoices`);
    return this.accountingService.createInvoiceForJob(jobId, {
      sendEmail: body?.sendEmail,
    });
  }

  /**
   * GET /api/v1/finance/ar/jobs/:jobId/invoices/:invoiceId
   * Returns a specific invoice for a job (Phase 5 Sprint 3)
   */
  @Get('ar/jobs/:jobId/invoices/:invoiceId')
  async getInvoiceForJob(
    @Param('jobId') jobId: string,
    @Param('invoiceId') invoiceId: string
  ): Promise<InvoiceDTO | null> {
    this.logger.log(`GET /api/v1/finance/ar/jobs/${jobId}/invoices/${invoiceId}`);
    return this.financeService.getInvoiceForJob(jobId, invoiceId);
  }
}
