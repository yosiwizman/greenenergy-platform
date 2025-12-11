import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FinanceService } from '../finance.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    jobFinancialSnapshot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  },
}));

describe('FinanceService', () => {
  let service: FinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService],
    }).compile();

    service = module.get<FinanceService>(FinanceService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getArSummary', () => {
    it('should return empty summary when no snapshots exist', async () => {
      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getArSummary();

      expect(result).toEqual({
        totalOutstanding: 0,
        totalPaid: 0,
        totalContractValue: 0,
        jobsPaid: 0,
        jobsPartiallyPaid: 0,
        jobsUnpaid: 0,
        jobsOverdue: 0,
      });
    });

    it('should correctly aggregate AR metrics across multiple jobs', async () => {
      const mockSnapshots = [
        {
          contractAmount: 50000,
          amountPaid: 50000,
          amountOutstanding: 0,
          arStatus: 'PAID',
        },
        {
          contractAmount: 40000,
          amountPaid: 20000,
          amountOutstanding: 20000,
          arStatus: 'PARTIALLY_PAID',
        },
        {
          contractAmount: 30000,
          amountPaid: 0,
          amountOutstanding: 30000,
          arStatus: 'UNPAID',
        },
        {
          contractAmount: 60000,
          amountPaid: 10000,
          amountOutstanding: 50000,
          arStatus: 'OVERDUE',
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await service.getArSummary();

      expect(result.totalContractValue).toBe(180000);
      expect(result.totalPaid).toBe(80000); // 50000 + 20000 + 0 + 10000
      expect(result.totalOutstanding).toBe(100000); // 0 + 20000 + 30000 + 50000
      expect(result.jobsPaid).toBe(1);
      expect(result.jobsPartiallyPaid).toBe(1);
      expect(result.jobsUnpaid).toBe(1);
      expect(result.jobsOverdue).toBe(1);
    });

    it('should handle null AR values gracefully', async () => {
      const mockSnapshots = [
        {
          contractAmount: 50000,
          amountPaid: null,
          amountOutstanding: null,
          arStatus: null,
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await service.getArSummary();

      expect(result.totalContractValue).toBe(50000);
      expect(result.totalPaid).toBe(0);
      expect(result.totalOutstanding).toBe(0);
    });
  });

  describe('listJobsWithArDetails', () => {
    it('should fetch all jobs when no status filter provided', async () => {
      const mockSnapshots = [
        {
          jobId: 'job1',
          contractAmount: 50000,
          amountPaid: 25000,
          amountOutstanding: 25000,
          arStatus: 'PARTIALLY_PAID',
          lastPaymentAt: new Date('2024-01-15'),
          invoiceDueDate: new Date('2024-02-15'),
          job: {
            id: 'job1',
            jobNimbusId: 'J-1001',
            customerName: 'John Doe',
            status: 'IN_PROGRESS',
          },
        },
      ];

      const mockPayments = [
        {
          id: 'pay1',
          jobId: 'job1',
          externalId: 'QB-PAY-1',
          externalInvoiceId: 'QB-INV-1',
          amount: 25000,
          receivedAt: new Date('2024-01-15'),
          paymentMethod: 'CHECK',
          status: 'APPLIED',
          referenceNumber: 'CHK-1001',
          notes: null,
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const result = await service.listJobsWithArDetails();

      expect(result).toHaveLength(1);
      expect(result[0]!.jobId).toBe('job1');
      expect(result[0]!.arStatus).toBe('PARTIALLY_PAID');
      expect(result[0]!.payments).toHaveLength(1);
      expect(prisma.jobFinancialSnapshot.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { amountOutstanding: 'desc' },
        take: 500,
      });
    });

    it('should filter jobs by AR status when provided', async () => {
      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);

      await service.listJobsWithArDetails('OVERDUE');

      expect(prisma.jobFinancialSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { arStatus: 'OVERDUE' },
        }),
      );
    });

    it('should map payments correctly to DTOs', async () => {
      const mockSnapshots = [
        {
          jobId: 'job1',
          contractAmount: 50000,
          amountPaid: 50000,
          amountOutstanding: 0,
          arStatus: 'PAID',
          lastPaymentAt: null,
          invoiceDueDate: null,
          job: {
            id: 'job1',
            jobNimbusId: 'J-1001',
            customerName: 'Jane Smith',
            status: 'COMPLETE',
          },
        },
      ];

      const mockPayments = [
        {
          id: 'pay1',
          jobId: 'job1',
          externalId: 'QB-PAY-1',
          externalInvoiceId: 'QB-INV-1',
          amount: 30000,
          receivedAt: new Date('2024-01-15'),
          paymentMethod: 'CREDIT_CARD',
          status: 'APPLIED',
          referenceNumber: 'CC-5678',
          notes: 'Initial payment',
        },
        {
          id: 'pay2',
          jobId: 'job1',
          externalId: 'QB-PAY-2',
          externalInvoiceId: 'QB-INV-1',
          amount: 20000,
          receivedAt: new Date('2024-02-01'),
          paymentMethod: 'CHECK',
          status: 'APPLIED',
          referenceNumber: null,
          notes: null,
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const result = await service.listJobsWithArDetails();

      expect(result[0]!.payments).toHaveLength(2);
      expect(result[0]!.payments[0]!.amount).toBe(30000);
      expect(result[0]!.payments[0]!.paymentMethod).toBe('CREDIT_CARD');
      expect(result[0]!.payments[1]!.amount).toBe(20000);
      expect(result[0]!.payments[1]!.paymentMethod).toBe('CHECK');
    });
  });

  describe('getJobArDetails', () => {
    it('should throw NotFoundException if snapshot not found', async () => {
      (prisma.jobFinancialSnapshot.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getJobArDetails('non-existent-job')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getJobArDetails('non-existent-job')).rejects.toThrow(
        'Financial snapshot for job non-existent-job not found',
      );
    });

    it('should return AR details with payments for a specific job', async () => {
      const mockSnapshot = {
        jobId: 'job1',
        contractAmount: 50000,
        amountPaid: 25000,
        amountOutstanding: 25000,
        arStatus: 'PARTIALLY_PAID',
        lastPaymentAt: new Date('2024-01-15'),
        invoiceDueDate: new Date('2024-02-28'),
        job: {
          id: 'job1',
          jobNimbusId: 'J-1001',
          customerName: 'Test Customer',
          status: 'IN_PROGRESS',
        },
      };

      const mockPayments = [
        {
          id: 'pay1',
          jobId: 'job1',
          externalId: 'QB-PAY-1',
          externalInvoiceId: 'QB-INV-1',
          amount: 25000,
          receivedAt: new Date('2024-01-15'),
          paymentMethod: 'ACH',
          status: 'APPLIED',
          referenceNumber: 'ACH-123',
          notes: 'Payment via bank transfer',
        },
      ];

      (prisma.jobFinancialSnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const result = await service.getJobArDetails('job1');

      expect(result.jobId).toBe('job1');
      expect(result.jobNumber).toBe('J-1001');
      expect(result.customerName).toBe('Test Customer');
      expect(result.contractAmount).toBe(50000);
      expect(result.amountPaid).toBe(25000);
      expect(result.amountOutstanding).toBe(25000);
      expect(result.arStatus).toBe('PARTIALLY_PAID');
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0]!.amount).toBe(25000);
    });

    it('should handle jobs with no payments', async () => {
      const mockSnapshot = {
        jobId: 'job1',
        contractAmount: 50000,
        amountPaid: 0,
        amountOutstanding: 50000,
        arStatus: 'UNPAID',
        lastPaymentAt: null,
        invoiceDueDate: null,
        job: {
          id: 'job1',
          jobNimbusId: 'J-1001',
          customerName: 'Test Customer',
          status: 'IN_PROGRESS',
        },
      };

      (prisma.jobFinancialSnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getJobArDetails('job1');

      expect(result.payments).toHaveLength(0);
      expect(result.amountPaid).toBe(0);
      expect(result.amountOutstanding).toBe(50000);
      expect(result.arStatus).toBe('UNPAID');
    });
  });
});
