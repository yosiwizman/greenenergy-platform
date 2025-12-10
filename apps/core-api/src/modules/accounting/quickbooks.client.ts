import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * Minimal QuickBooks Invoice structure
 */
export interface QuickbooksInvoice {
  Id: string;
  DocNumber: string;
  TotalAmt: number;
  Balance: number;
  TxnDate: string;
  CustomerRef?: {
    value: string;
    name?: string;
  };
  CurrencyRef?: {
    value: string;
  };
  LastUpdatedTime?: string;
}

/**
 * QuickBooks Online API Client (v1 - read-only)
 * 
 * For v1, we assume:
 * - Job's jobNimbusId maps to QuickBooks Invoice.DocNumber
 * - If multiple invoices match, we pick the latest by TxnDate
 * - Network calls are disabled if QB_ENABLED is false
 */
@Injectable()
export class QuickbooksClient {
  private readonly logger = new Logger(QuickbooksClient.name);
  private readonly httpClient: AxiosInstance;
  private readonly enabled: boolean;
  private readonly baseUrl: string;
  private readonly companyId: string;
  private readonly accessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<string>('QB_ENABLED', 'false') === 'true';
    this.baseUrl = this.configService.get<string>('QB_BASE_URL', 'https://quickbooks.api.intuit.com');
    this.companyId = this.configService.get<string>('QB_COMPANY_ID', '');
    this.accessToken = this.configService.get<string>('QB_ACCESS_TOKEN', '');

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!this.enabled) {
      this.logger.warn('QuickBooks integration is DISABLED (QB_ENABLED=false)');
    } else if (!this.companyId || !this.accessToken) {
      this.logger.warn('QuickBooks credentials incomplete (QB_COMPANY_ID or QB_ACCESS_TOKEN missing)');
    } else {
      this.logger.log('QuickBooks client initialized');
    }
  }

  /**
   * Fetch invoice by job number (mapped to DocNumber in QuickBooks)
   * Returns null if disabled, not found, or on error
   */
  async fetchInvoiceByJobNumber(jobNumber: string): Promise<QuickbooksInvoice | null> {
    if (!this.enabled) {
      this.logger.debug(`QuickBooks disabled, skipping invoice fetch for job: ${jobNumber}`);
      return null;
    }

    if (!this.companyId || !this.accessToken) {
      this.logger.warn('QuickBooks credentials missing, cannot fetch invoice');
      return null;
    }

    if (!jobNumber) {
      this.logger.debug('No job number provided, cannot fetch invoice');
      return null;
    }

    try {
      this.logger.log(`Fetching QuickBooks invoice for job number: ${jobNumber}`);

      // Query invoices by DocNumber
      // QuickBooks API: GET /v3/company/:companyId/query?query=...
      const query = `SELECT * FROM Invoice WHERE DocNumber = '${this.escapeQuickbooksQuery(jobNumber)}'`;
      const url = `/v3/company/${this.companyId}/query`;

      const response = await this.httpClient.get(url, {
        params: { query },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
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
      this.logger.log(`Found QuickBooks invoice ${invoice.Id} (DocNumber: ${invoice.DocNumber}) for job ${jobNumber}`);

      return invoice;
    } catch (error: any) {
      this.logger.error(`Failed to fetch QuickBooks invoice for job ${jobNumber}:`, error.message);
      
      // Log more details for debugging
      if (error.response) {
        this.logger.error(`QuickBooks API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
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
   * Check if QuickBooks integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
