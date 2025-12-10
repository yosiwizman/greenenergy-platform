import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountingService } from '../accounting.service';
import { QuickbooksClient } from '../quickbooks.client';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    jobFinancialSnapshot: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('AccountingService', () => {
  let service: AccountingService;
  let quickbooksClient: QuickbooksClient;

  beforeEach(async () => {
    // Create mock QuickbooksClient
    const mockQuickbooksClient = {
      fetchInvoiceByJobNumber: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingService,
        {
          provide: QuickbooksClient,
          useValue: mockQuickbooksClient,
        },
      ],
    }).compile();

    service = module.get<AccountingService>(AccountingService);
    quickbooksClient = module.get<QuickbooksClient>(QuickbooksClient);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('syncJobFromQuickbooks', () => {
    it('should throw NotFoundException if job not found', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.syncJobFromQuickbooks('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create placeholder snapshot when job has no jobNimbusId', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: null,
        systemSize: 10.5,
        financialSnapshot: null,
        riskSnapshot: { riskLevel: 'LOW' },
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.jobFinancialSnapshot.upsert as jest.Mock).mockResolvedValue({
        id: 'snap1',
        jobId: 'job1',
        contractAmount: 36750, // 10.5 * 3.5 * 1000
        accountingSource: 'PLACEHOLDER',
        accountingLastSyncAt: null,
      });

      const result = await service.syncJobFromQuickbooks('job1');

      expect(result.accountingSource).toBe('PLACEHOLDER');
      expect(result.contractAmount).toBe(36750);
      expect(prisma.jobFinancialSnapshot.upsert).toHaveBeenCalled();
    });

    it('should create placeholder snapshot when QuickBooks is disabled', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: 'J-1001',
        systemSize: 10.5,
        financialSnapshot: null,
        riskSnapshot: { riskLevel: 'LOW' },
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (quickbooksClient.fetchInvoiceByJobNumber as jest.Mock).mockResolvedValue(null);
      (prisma.jobFinancialSnapshot.upsert as jest.Mock).mockResolvedValue({
        id: 'snap1',
        jobId: 'job1',
        contractAmount: 36750,
        accountingSource: 'PLACEHOLDER',
        accountingLastSyncAt: null,
      });

      const result = await service.syncJobFromQuickbooks('job1');

      expect(quickbooksClient.fetchInvoiceByJobNumber).toHaveBeenCalledWith('J-1001');
      expect(result.accountingSource).toBe('PLACEHOLDER');
    });

    it('should sync from QuickBooks when invoice is found', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: 'J-1001',
        systemSize: 10.5,
        financialSnapshot: {
          estimatedCost: 12000,
          actualCost: null,
        },
        riskSnapshot: { riskLevel: 'MEDIUM' },
      };

      const mockInvoice = {
        Id: 'QB-123',
        DocNumber: 'J-1001',
        TotalAmt: 45000,
        Balance: 0,
        TxnDate: '2024-01-15',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (quickbooksClient.fetchInvoiceByJobNumber as jest.Mock).mockResolvedValue(mockInvoice);
      (prisma.jobFinancialSnapshot.upsert as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: 'snap1',
          jobId: 'job1',
          ...args.create,
        });
      });

      const result = await service.syncJobFromQuickbooks('job1');

      expect(quickbooksClient.fetchInvoiceByJobNumber).toHaveBeenCalledWith('J-1001');
      expect(result.contractAmount).toBe(45000);
      expect(result.accountingSource).toBe('QUICKBOOKS');
      expect(result.accountingLastSyncAt).toBeDefined();

      // Verify margin calculation
      const upsertCall = (prisma.jobFinancialSnapshot.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.marginAmount).toBe(33000); // 45000 - 12000
      expect(upsertCall.create.marginPercent).toBeCloseTo(73.33, 1);
    });

    it('should mark existing snapshot as PLACEHOLDER when no invoice found', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: 'J-1001',
        systemSize: 10.5,
        financialSnapshot: {
          id: 'snap1',
          contractAmount: 50000,
          accountingSource: 'QUICKBOOKS',
        },
        riskSnapshot: null,
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (quickbooksClient.fetchInvoiceByJobNumber as jest.Mock).mockResolvedValue(null);
      (prisma.jobFinancialSnapshot.update as jest.Mock).mockResolvedValue({
        id: 'snap1',
        jobId: 'job1',
        contractAmount: 50000,
        accountingSource: 'PLACEHOLDER',
      });

      const result = await service.syncJobFromQuickbooks('job1');

      expect(prisma.jobFinancialSnapshot.update).toHaveBeenCalledWith({
        where: { jobId: 'job1' },
        data: { accountingSource: 'PLACEHOLDER' },
      });
      expect(result.accountingSource).toBe('PLACEHOLDER');
    });
  });

  describe('syncAllActiveJobsFromQuickbooks', () => {
    it('should process all active jobs', async () => {
      const mockJobs = [
        { id: 'job1', jobNimbusId: 'J-1001' },
        { id: 'job2', jobNimbusId: 'J-1002' },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.job.findUnique as jest.Mock).mockImplementation((args) => {
        return Promise.resolve({
          id: args.where.id,
          jobNimbusId: args.where.id === 'job1' ? 'J-1001' : 'J-1002',
          systemSize: 10,
          financialSnapshot: null,
          riskSnapshot: null,
        });
      });
      (quickbooksClient.fetchInvoiceByJobNumber as jest.Mock).mockResolvedValue(null);
      (prisma.jobFinancialSnapshot.upsert as jest.Mock).mockResolvedValue({
        id: 'snap1',
        jobId: 'job1',
        contractAmount: 35000,
        accountingSource: 'PLACEHOLDER',
      });

      await service.syncAllActiveJobsFromQuickbooks();

      expect(prisma.job.findMany).toHaveBeenCalledWith({
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
      expect(prisma.job.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should continue processing when one job fails', async () => {
      const mockJobs = [
        { id: 'job1', jobNimbusId: 'J-1001' },
        { id: 'job2', jobNimbusId: 'J-1002' },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.job.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // job1 not found
        .mockResolvedValueOnce({
          id: 'job2',
          jobNimbusId: 'J-1002',
          systemSize: 10,
          financialSnapshot: null,
          riskSnapshot: null,
        });
      (quickbooksClient.fetchInvoiceByJobNumber as jest.Mock).mockResolvedValue(null);
      (prisma.jobFinancialSnapshot.upsert as jest.Mock).mockResolvedValue({
        id: 'snap2',
        jobId: 'job2',
        contractAmount: 35000,
        accountingSource: 'PLACEHOLDER',
      });

      await service.syncAllActiveJobsFromQuickbooks();

      // Should have attempted both jobs despite first one failing
      expect(prisma.job.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
