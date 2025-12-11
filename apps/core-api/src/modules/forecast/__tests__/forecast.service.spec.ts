import { Test, TestingModule } from '@nestjs/testing';
import { ForecastService } from '../forecast.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    invoice: {
      findMany: jest.fn(),
    },
    job: {
      findMany: jest.fn(),
    },
  },
}));

describe('ForecastService', () => {
  let service: ForecastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ForecastService],
    }).compile();

    service = module.get<ForecastService>(ForecastService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getCashflowForecast', () => {
    it('should return empty forecast when no invoices exist', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getCashflowForecast(12);

      expect(result.horizonWeeks).toBe(12);
      expect(result.points).toHaveLength(12);
      expect(result.points.every((p) => p.expectedInflow === 0)).toBe(true);
    });

    it('should assign future invoices to correct weekly buckets', async () => {
      const today = new Date();
      const futureDate1 = new Date(today);
      futureDate1.setDate(today.getDate() + 7); // 1 week out

      const futureDate2 = new Date(today);
      futureDate2.setDate(today.getDate() + 21); // 3 weeks out

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv1',
          balance: 10000,
          dueDate: futureDate1,
          status: 'OPEN',
        },
        {
          id: 'inv2',
          balance: 20000,
          dueDate: futureDate2,
          status: 'OPEN',
        },
      ]);

      const result = await service.getCashflowForecast(12);

      expect(result.points.some((p) => p.expectedInflow > 0)).toBe(true);
      const totalInflow = result.points.reduce((sum, p) => sum + p.expectedInflow, 0);
      expect(totalInflow).toBe(30000);
    });

    it('should assign overdue invoices to first bucket with overdue flag', async () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 30); // 30 days overdue

      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv1',
          balance: 15000,
          dueDate: pastDate,
          status: 'OPEN',
        },
      ]);

      const result = await service.getCashflowForecast(12);

      expect(result.points[0]!.expectedInflow).toBe(15000);
      expect(result.points[0]!.overduePortion).toBe(15000);
      expect(result.points[0]!.invoiceCount).toBe(1);
    });

    it('should handle invoices without due dates', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'inv1',
          balance: 5000,
          dueDate: null,
          status: 'OPEN',
        },
      ]);

      const result = await service.getCashflowForecast(12);

      expect(result.points[0]!.expectedInflow).toBe(5000);
      expect(result.points[0]!.invoiceCount).toBe(1);
    });
  });

  describe('getPipelineForecast', () => {
    it('should return empty forecast when no pipeline jobs exist', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPipelineForecast();

      expect(result.totalPipelineAmount).toBe(0);
      expect(result.totalWeightedAmount).toBe(0);
      expect(result.buckets).toHaveLength(0);
    });

    it('should calculate weighted pipeline by status', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'job1',
          status: 'LEAD',
          financialSnapshot: {
            contractAmount: 50000,
            arStatus: 'UNPAID',
          },
        },
        {
          id: 'job2',
          status: 'SCHEDULED',
          financialSnapshot: {
            contractAmount: 100000,
            arStatus: 'UNPAID',
          },
        },
        {
          id: 'job3',
          status: 'IN_PROGRESS',
          financialSnapshot: {
            contractAmount: 75000,
            arStatus: 'PARTIALLY_PAID',
          },
        },
      ]);

      const result = await service.getPipelineForecast();

      expect(result.totalPipelineAmount).toBe(225000);
      expect(result.buckets).toHaveLength(3);

      // Verify weighted amounts (win probabilities from service)
      // LEAD: 50000 * 0.2 = 10000
      // SCHEDULED: 100000 * 0.85 = 85000
      // IN_PROGRESS: 75000 * 0.95 = 71250
      expect(result.totalWeightedAmount).toBeCloseTo(166250, 0);

      // Check buckets are sorted by weighted amount descending
      expect(result.buckets[0]!.statusKey).toBe('SCHEDULED');
      expect(result.buckets[0]!.weightedAmount).toBeCloseTo(85000, 0);
    });

    it('should filter out fully paid jobs', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'job1',
          status: 'LEAD',
          financialSnapshot: {
            contractAmount: 50000,
            arStatus: 'UNPAID',
          },
        },
        {
          id: 'job2',
          status: 'SCHEDULED',
          financialSnapshot: {
            contractAmount: 100000,
            arStatus: 'PAID', // Should be filtered out
          },
        },
      ]);

      const result = await service.getPipelineForecast();

      expect(result.totalPipelineAmount).toBe(50000);
      expect(result.buckets).toHaveLength(1);
      expect(result.buckets[0]!.statusKey).toBe('LEAD');
    });

    it('should use default win probability for unknown statuses', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'job1',
          status: 'UNKNOWN_STATUS',
          financialSnapshot: {
            contractAmount: 10000,
            arStatus: 'UNPAID',
          },
        },
      ]);

      const result = await service.getPipelineForecast();

      expect(result.buckets[0]!.winProbability).toBe(0.15); // Default
      expect(result.buckets[0]!.weightedAmount).toBeCloseTo(1500, 0);
    });
  });

  describe('getForecastOverview', () => {
    it('should combine cashflow and pipeline forecasts', async () => {
      (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getForecastOverview(12);

      expect(result.cashflow).toBeDefined();
      expect(result.pipeline).toBeDefined();
      expect(result.cashflow.horizonWeeks).toBe(12);
      expect(result.generatedAt).toBeDefined();
    });
  });
});
