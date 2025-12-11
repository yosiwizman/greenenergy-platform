import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { QuickbooksAuthService } from './quickbooks-auth.service';

/**
 * Minimal QuickBooks Invoice structure
 */
export interface QuickbooksInvoice {
  Id: string;
  DocNumber: string;
  TotalAmt: number;
  Balance: number;
  DueDate?: string;
  TxnDate: string;
  CustomerRef?: {
    value: string;
    name?: string;
  };
  CurrencyRef?: {
    value: string;
  };
  LastUpdatedTime?: string;
  LinkedTxn?: Array<{
    TxnId: string;
    TxnType: string;
  }>;
}

/**
 * Minimal QuickBooks Payment structure
 */
export interface QuickbooksPayment {
  Id: string;
  TotalAmt: number;
  TxnDate: string;
  PaymentMethodRef?: {
    value: string;
    name?: string;
  };
  PaymentRefNum?: string;
  CustomerRef?: {
    value: string;
    name?: string;
  };
  PrivateNote?: string;
  Line?: Array<{
    Amount: number;
    LinkedTxn?: Array<{
      TxnId: string;
      TxnType: string;
    }>;
  }>;
}

/**
 * QuickBooks Online API Client (v1.1 - read-only with OAuth2)
 *
 * For v1.1, we use QuickbooksAuthService for token management:
 * - Automatic token refresh via OAuth2
 * - Job's jobNimbusId maps to QuickBooks Invoice.DocNumber
 * - If multiple invoices match, we pick the latest by TxnDate
 * - Network calls are disabled if QB_ENABLED is false
 */
@Injectable()
export class QuickbooksClient {
  private readonly logger = new Logger(QuickbooksClient.name);
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly companyId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: QuickbooksAuthService
  ) {
    this.baseUrl = this.configService.get<string>(
      'QB_BASE_URL',
      'https://quickbooks.api.intuit.com'
    );
    this.companyId = this.configService.get<string>('QB_COMPANY_ID', '');

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!this.authService.isEnabled()) {
      this.logger.warn('QuickBooks integration is DISABLED');
    } else if (!this.companyId) {
      this.logger.warn('QuickBooks credentials incomplete (QB_COMPANY_ID missing)');
    } else {
      this.logger.log('QuickBooks client initialized');
    }
  }

  /**
   * Fetch invoice by job number (mapped to DocNumber in QuickBooks)
   * Returns null if disabled, not found, or on error
   */
  async fetchInvoiceByJobNumber(jobNumber: string): Promise<QuickbooksInvoice | null> {
    if (!this.authService.isEnabled()) {
      this.logger.debug(`QuickBooks disabled, skipping invoice fetch for job: ${jobNumber}`);
      return null;
    }

    if (!this.companyId) {
      this.logger.warn('QuickBooks credentials missing (QB_COMPANY_ID), cannot fetch invoice');
      return null;
    }

    if (!jobNumber) {
      this.logger.debug('No job number provided, cannot fetch invoice');
      return null;
    }

    try {
      this.logger.log(`Fetching QuickBooks invoice for job number: ${jobNumber}`);

      // Get access token from auth service
      const accessToken = await this.authService.getAccessToken();

      // Query invoices by DocNumber
      // QuickBooks API: GET /v3/company/:companyId/query?query=...
      const query = `SELECT * FROM Invoice WHERE DocNumber = '${this.escapeQuickbooksQuery(jobNumber)}'`;
      const url = `/v3/company/${this.companyId}/query`;

      const response = await this.httpClient.get(url, {
        params: { query },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const invoices = response.data?.QueryResponse?.Invoice || [];

      if (invoices.length === 0) {
        this.logger.debug(`No QuickBooks invoice found for job number: ${jobNumber}`);
        return null;
      }

      // If multiple invoices, pick the latest by TxnDate or LastUpdatedTime
      const sortedInvoices = invoices.sort((a: QuickbooksInvoice, b: QuickbooksInvoice) => {
        const dateA = new Date(a.LastUpdatedTime || a.TxnDate).getTime();
        const dateB = new Date(b.LastUpdatedTime || b.TxnDate).getTime();
        return dateB - dateA; // descending
      });

      const invoice = sortedInvoices[0];
      this.logger.log(
        `Found QuickBooks invoice ${invoice.Id} (DocNumber: ${invoice.DocNumber}) for job ${jobNumber}`
      );

      return invoice;
    } catch (error: any) {
      this.logger.error(`Failed to fetch QuickBooks invoice for job ${jobNumber}:`, error.message);

      // Log more details for debugging
      if (error.response) {
        this.logger.error(
          `QuickBooks API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }

      return null;
    }
  }

  /**
   * Escape special characters in QuickBooks query strings
   */
  private escapeQuickbooksQuery(value: string): string {
    // Escape single quotes by doubling them
    return value.replace(/'/g, "''");
  }

  /**
   * Fetch payments linked to a specific invoice
   * Returns empty array if disabled, not found, or on error
   */
  async fetchPaymentsForInvoice(invoiceId: string): Promise<QuickbooksPayment[]> {
    if (!this.authService.isEnabled()) {
      this.logger.debug(`QuickBooks disabled, skipping payment fetch for invoice: ${invoiceId}`);
      return [];
    }

    if (!this.companyId) {
      this.logger.warn('QuickBooks credentials missing (QB_COMPANY_ID), cannot fetch payments');
      return [];
    }

    if (!invoiceId) {
      this.logger.debug('No invoice ID provided, cannot fetch payments');
      return [];
    }

    try {
      this.logger.log(`Fetching QuickBooks payments for invoice: ${invoiceId}`);

      // Get access token from auth service
      const accessToken = await this.authService.getAccessToken();

      // Query payments linked to this invoice
      // QuickBooks API: Payments are linked via Line.LinkedTxn where TxnType='Invoice'
      const query = `SELECT * FROM Payment WHERE Line.LinkedTxn.TxnId = '${this.escapeQuickbooksQuery(invoiceId)}'`;
      const url = `/v3/company/${this.companyId}/query`;

      const response = await this.httpClient.get(url, {
        params: { query },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payments = response.data?.QueryResponse?.Payment || [];

      if (payments.length === 0) {
        this.logger.debug(`No QuickBooks payments found for invoice: ${invoiceId}`);
        return [];
      }

      this.logger.log(`Found ${payments.length} payment(s) for invoice ${invoiceId}`);
      return payments;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch QuickBooks payments for invoice ${invoiceId}:`,
        error.message
      );

      // Log more details for debugging
      if (error.response) {
        this.logger.error(
          `QuickBooks API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }

      return [];
    }
  }

  /**
   * Create a new invoice in QuickBooks
   * Returns the created invoice or null if disabled/error
   */
  async createInvoice(params: {
    customerRef: { value: string; name?: string };
    docNumber?: string;
    dueDate?: string; // YYYY-MM-DD
    lineItems: Array<{
      description: string;
      amount: number;
    }>;
  }): Promise<QuickbooksInvoice | null> {
    if (!this.authService.isEnabled()) {
      this.logger.debug('QuickBooks disabled, skipping invoice creation');
      return null;
    }

    if (!this.companyId) {
      this.logger.warn('QuickBooks credentials missing (QB_COMPANY_ID), cannot create invoice');
      return null;
    }

    try {
      this.logger.log(`Creating QuickBooks invoice for customer ${params.customerRef.value}`);

      // Get access token from auth service
      const accessToken = await this.authService.getAccessToken();

      // Calculate total amount
      const totalAmount = params.lineItems.reduce((sum, item) => sum + item.amount, 0);

      // Build invoice payload
      const invoicePayload: any = {
        CustomerRef: params.customerRef,
        Line: params.lineItems.map((item, index) => ({
          Id: String(index + 1),
          LineNum: index + 1,
          Amount: item.amount,
          DetailType: 'SalesItemLineDetail',
          Description: item.description,
          SalesItemLineDetail: {
            Qty: 1,
            UnitPrice: item.amount,
            // Optional: Add ItemRef if you have a default service item in QB
          },
        })),
        TxnDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
      };

      // Add optional fields
      if (params.docNumber) {
        invoicePayload.DocNumber = params.docNumber;
      }

      if (params.dueDate) {
        invoicePayload.DueDate = params.dueDate;
      }

      // POST to QuickBooks API
      const url = `/v3/company/${this.companyId}/invoice`;
      const response = await this.httpClient.post(url, invoicePayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const invoice = response.data?.Invoice;

      if (!invoice) {
        this.logger.error('QuickBooks API returned no invoice in response');
        return null;
      }

      this.logger.log(`Created QuickBooks invoice ${invoice.Id} (DocNumber: ${invoice.DocNumber})`);
      return invoice;
    } catch (error: any) {
      this.logger.error('Failed to create QuickBooks invoice:', error.message);

      // Log more details for debugging
      if (error.response) {
        this.logger.error(
          `QuickBooks API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }

      return null;
    }
  }

  /**
   * Check if QuickBooks integration is enabled
   */
  isEnabled(): boolean {
    return this.authService.isEnabled();
  }
}
