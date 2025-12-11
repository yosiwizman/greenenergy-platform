import { Test, TestingModule } from '@nestjs/testing';
import { CommandCenterService } from '../command-center.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    jobRiskSnapshot: {
      count: jest.fn(),
    },
    jobFinancialSnapshot: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    safetyIncident: {
      count: jest.fn(),
    },
    subcontractor: {
      groupBy: jest.fn(),
    },
    warranty: {
      count: jest.fn(),
    },
    materialOrder: {
      count: jest.fn(),
    },
    workflowActionLog: {
      count: jest.fn(),
    },
    qCPhotoCheck: {
      count: jest.fn(),
    },
  },
}));

describe('CommandCenterService', () => {
  let service: CommandCenterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommandCenterService],
    }).compile();

    service = module.get<CommandCenterService>(CommandCenterService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return properly shaped CommandCenterOverviewDTO', async () => {
      // Mock all Prisma calls to return basic data
      (prisma.job.count as jest.Mock).mockResolvedValue(100);
      (prisma.jobRiskSnapshot.count as jest.Mock).mockResolvedValue(15);
      (prisma.jobFinancialSnapshot.count as jest.Mock).mockResolvedValue(10);
      (prisma.jobFinancialSnapshot.aggregate as jest.Mock).mockResolvedValue({
        _avg: { marginPercent: 18.5 },
        _sum: { contractAmount: 500000 },
      });
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(5);
      (prisma.subcontractor.groupBy as jest.Mock).mockResolvedValue([
        { status: 'GREEN', _count: 20 },
        { status: 'YELLOW', _count: 5 },
        { status: 'RED', _count: 2 },
      ]);
      (prisma.warranty.count as jest.Mock).mockResolvedValue(3);
      (prisma.materialOrder.count as jest.Mock).mockResolvedValue(8);
      (prisma.workflowActionLog.count as jest.Mock).mockResolvedValue(12);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(7);
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview).toBeDefined();
      expect(overview).toHaveProperty('summary');
      expect(overview).toHaveProperty('roleViews');
      expect(overview).toHaveProperty('jobsNeedingAttention');

      // Check summary structure
      expect(overview.summary).toHaveProperty('jobsInProgress');
      expect(overview.summary).toHaveProperty('jobsHighRisk');
      expect(overview.summary).toHaveProperty('openSafetyIncidents');
      expect(overview.summary).toHaveProperty('subsGreen');
      expect(overview.summary).toHaveProperty('workflowActionsLast24h');

      // Check roleViews structure
      expect(overview.roleViews).toHaveProperty('executive');
      expect(overview.roleViews).toHaveProperty('production');
      expect(overview.roleViews).toHaveProperty('safety');
      expect(overview.roleViews).toHaveProperty('finance');

      expect(overview.roleViews.executive).toHaveProperty('totalJobs');
      expect(overview.roleViews.executive).toHaveProperty('jobsInProgress');
      expect(overview.roleViews.executive).toHaveProperty('avgMarginPercent');

      expect(overview.roleViews.production).toHaveProperty('jobsWithQcIssues');
      expect(overview.roleViews.production).toHaveProperty('jobsWithDelayedMaterials');

      expect(overview.roleViews.safety).toHaveProperty('openIncidents');
      expect(overview.roleViews.safety).toHaveProperty('highSeverityIncidents');

      expect(overview.roleViews.finance).toHaveProperty('lowMarginJobs');
      expect(overview.roleViews.finance).toHaveProperty('totalContractAmount');

      // Check jobsNeedingAttention is array
      expect(Array.isArray(overview.jobsNeedingAttention)).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
      // Mock all counts as zero
      (prisma.job.count as jest.Mock).mockResolvedValue(0);
      (prisma.jobRiskSnapshot.count as jest.Mock).mockResolvedValue(0);
      (prisma.jobFinancialSnapshot.count as jest.Mock).mockResolvedValue(0);
      (prisma.jobFinancialSnapshot.aggregate as jest.Mock).mockResolvedValue({
        _avg: { marginPercent: null },
        _sum: { contractAmount: null },
      });
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);
      (prisma.subcontractor.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.warranty.count as jest.Mock).mockResolvedValue(0);
      (prisma.materialOrder.count as jest.Mock).mockResolvedValue(0);
      (prisma.workflowActionLog.count as jest.Mock).mockResolvedValue(0);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(0);
      (prisma.job.findMany as jest.Mock).mockResolvedValue([]);

      const overview = await service.getOverview();

      expect(overview).toBeDefined();
      expect(overview.summary.jobsInProgress).toBe(0);
      expect(overview.summary.jobsHighRisk).toBe(0);
      expect(overview.roleViews.executive.totalJobs).toBe(0);
      expect(overview.roleViews.executive.avgMarginPercent).toBeNull();
      expect(overview.jobsNeedingAttention).toEqual([]);
    });
  });

  describe('getJobsNeedingAttention', () => {
    it('should return jobs with multiple issues', async () => {
      const mockJobs = [
        {
          id: 'job1',
          customerName: 'Customer A',
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
          riskSnapshot: { riskLevel: 'HIGH' },
          qcPhotoChecks: [{ id: 'qc1', status: 'FAIL' }],
          financialSnapshot: { marginPercent: 8 },
          safetyIncidents: [{ id: 'incident1', status: 'OPEN' }],
          materialOrders: [],
          warranties: [],
        },
        {
          id: 'job2',
          customerName: 'Customer B',
          status: 'SCHEDULED',
          updatedAt: new Date(),
          riskSnapshot: { riskLevel: 'LOW' },
          qcPhotoChecks: [],
          financialSnapshot: { marginPercent: 25 },
          safetyIncidents: [],
          materialOrders: [],
          warranties: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const jobs = await service.getJobsNeedingAttention();

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBe(1); // Only job1 has issues

      const job1 = jobs[0];
      expect(job1?.jobId).toBe('job1');
      expect(job1?.hasQcFail).toBe(true);
      expect(job1?.hasOpenSafetyIncident).toBe(true);
      expect(job1?.isLowMarginHighRisk).toBe(true);
      expect(job1?.riskLevel).toBe('HIGH');
    });

    it('should return empty array when no jobs have issues', async () => {
      const mockJobs = [
        {
          id: 'job1',
          customerName: 'Customer A',
          status: 'IN_PROGRESS',
          updatedAt: new Date(),
          riskSnapshot: { riskLevel: 'LOW' },
          qcPhotoChecks: [],
          financialSnapshot: { marginPercent: 25 },
          safetyIncidents: [],
          materialOrders: [],
          warranties: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const jobs = await service.getJobsNeedingAttention();

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBe(0);
    });
  });
});
