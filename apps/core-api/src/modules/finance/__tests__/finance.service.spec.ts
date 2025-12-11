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
    job: {
      findUnique: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
        })
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

      await expect(service.getJobArDetails('non-existent-job')).rejects.toThrow(NotFoundException);
      await expect(service.getJobArDetails('non-existent-job')).rejects.toThrow(
        'Financial snapshot for job non-existent-job not found'
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

  describe('getArAgingSummary (Phase 5 Sprint 2)', () => {
    it('should return empty buckets when no jobs have outstanding amounts', async () => {
      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getArAgingSummary();

      expect(result.totalOutstanding).toBe(0);
      expect(result.buckets).toHaveLength(5);
      result.buckets.forEach((bucket) => {
        expect(bucket.outstanding).toBe(0);
        expect(bucket.jobsCount).toBe(0);
      });
    });

    it('should correctly bucket jobs by days overdue', async () => {
      const now = new Date('2024-03-15');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockSnapshots = [
        {
          jobId: 'job1',
          amountOutstanding: 10000,
          invoiceDueDate: new Date('2024-03-20'), // 5 days in future = CURRENT
        },
        {
          jobId: 'job2',
          amountOutstanding: 20000,
          invoiceDueDate: new Date('2024-03-01'), // 14 days overdue = DAYS_1_30
        },
        {
          jobId: 'job3',
          amountOutstanding: 30000,
          invoiceDueDate: new Date('2024-01-30'), // 45 days overdue = DAYS_31_60
        },
        {
          jobId: 'job4',
          amountOutstanding: 40000,
          invoiceDueDate: new Date('2023-12-30'), // 76 days overdue = DAYS_61_90
        },
        {
          jobId: 'job5',
          amountOutstanding: 50000,
          invoiceDueDate: new Date('2023-11-15'), // 121 days overdue = DAYS_91_PLUS
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await service.getArAgingSummary();

      expect(result.totalOutstanding).toBe(150000);

      const currentBucket = result.buckets.find((b) => b.bucket === 'CURRENT')!;
      expect(currentBucket.outstanding).toBe(10000);
      expect(currentBucket.jobsCount).toBe(1);

      const days1to30Bucket = result.buckets.find((b) => b.bucket === 'DAYS_1_30')!;
      expect(days1to30Bucket.outstanding).toBe(20000);
      expect(days1to30Bucket.jobsCount).toBe(1);

      const days31to60Bucket = result.buckets.find((b) => b.bucket === 'DAYS_31_60')!;
      expect(days31to60Bucket.outstanding).toBe(30000);
      expect(days31to60Bucket.jobsCount).toBe(1);

      const days61to90Bucket = result.buckets.find((b) => b.bucket === 'DAYS_61_90')!;
      expect(days61to90Bucket.outstanding).toBe(40000);
      expect(days61to90Bucket.jobsCount).toBe(1);

      const days91PlusBucket = result.buckets.find((b) => b.bucket === 'DAYS_91_PLUS')!;
      expect(days91PlusBucket.outstanding).toBe(50000);
      expect(days91PlusBucket.jobsCount).toBe(1);

      jest.useRealTimers();
    });

    it('should handle jobs with no due date as CURRENT', async () => {
      const mockSnapshots = [
        {
          jobId: 'job1',
          amountOutstanding: 10000,
          invoiceDueDate: null,
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await service.getArAgingSummary();

      const currentBucket = result.buckets.find((b) => b.bucket === 'CURRENT')!;
      expect(currentBucket.outstanding).toBe(10000);
      expect(currentBucket.jobsCount).toBe(1);
    });

    it('should ignore jobs with zero or negative outstanding amounts', async () => {
      const mockSnapshots = [
        {
          jobId: 'job1',
          amountOutstanding: 0,
          invoiceDueDate: new Date('2024-01-01'),
        },
        {
          jobId: 'job2',
          amountOutstanding: -100,
          invoiceDueDate: new Date('2024-01-01'),
        },
        {
          jobId: 'job3',
          amountOutstanding: null,
          invoiceDueDate: new Date('2024-01-01'),
        },
      ];

      (prisma.jobFinancialSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const result = await service.getArAgingSummary();

      expect(result.totalOutstanding).toBe(0);
      result.buckets.forEach((bucket) => {
        expect(bucket.outstanding).toBe(0);
        expect(bucket.jobsCount).toBe(0);
      });
    });
  });

  describe('listInvoicesForJob (Phase 5 Sprint 3)', () => {
    it('should return list of invoices for a job', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: 'J-1001',
        customerName: 'John Doe',
      };

      const mockInvoices = [
        {
          id: 'inv1',
          jobId: 'job1',
          externalId: 'QB-INV-1',
          number: 'INV-001',
          dueDate: new Date('2024-03-01'),
          totalAmount: 50000,
          balance: 50000,
          status: 'OPEN',
          publicUrl: null,
          createdAt: new Date('2024-02-01'),
          updatedAt: new Date('2024-02-01'),
        },
        {
          id: 'inv2',
          jobId: 'job1',
          externalId: 'QB-INV-2',
          number: 'INV-002',
          dueDate: new Date('2024-04-01'),
          totalAmount: 25000,
          balance: 0,
          status: 'PAID',
          publicUrl: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-15'),
        },
      ];

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue(mockInvoices);

      const result = await service.listInvoicesForJob('job1');

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('inv1');
      expect(result[0]!.number).toBe('INV-001');
      expect(result[0]!.totalAmount).toBe(50000);
      expect(result[1]!.id).toBe('inv2');
      expect(result[1]!.status).toBe('PAID');

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { jobId: 'job1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if job not found', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.listInvoicesForJob('non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return empty array if no invoices exist', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: 'J-1001',
        customerName: 'John Doe',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.listInvoicesForJob('job1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getInvoiceForJob (Phase 5 Sprint 3)', () => {
    it('should return invoice if found', async () => {
      const mockInvoice = {
        id: 'inv1',
        jobId: 'job1',
        externalId: 'QB-INV-1',
        number: 'INV-001',
        dueDate: new Date('2024-03-01'),
        totalAmount: 50000,
        balance: 50000,
        status: 'OPEN',
        publicUrl: null,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(mockInvoice);

      const result = await service.getInvoiceForJob('job1', 'inv1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('inv1');
      expect(result?.number).toBe('INV-001');
      expect(result?.totalAmount).toBe(50000);

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'inv1',
          jobId: 'job1',
        },
      });
    });

    it('should return null if invoice not found', async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.getInvoiceForJob('job1', 'non-existent-inv');

      expect(result).toBeNull();
    });
  });
});
