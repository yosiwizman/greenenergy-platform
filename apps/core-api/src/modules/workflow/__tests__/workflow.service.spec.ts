import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WorkflowService } from '../workflow.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    workflowActionLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    qCPhotoCheck: {
      findFirst: jest.fn(),
    },
    materialOrder: {
      findMany: jest.fn(),
    },
    jobSubcontractorAssignment: {
      findMany: jest.fn(),
    },
    safetyIncident: {
      findMany: jest.fn(),
    },
    warranty: {
      findUnique: jest.fn(),
    },
    jobFinancialSnapshot: {
      findUnique: jest.fn(),
    },
    jobRiskSnapshot: {
      findUnique: jest.fn(),
    },
  },
}));

describe('WorkflowService', () => {
  let service: WorkflowService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              // Return defaults for config
              if (key === 'JOBNIMBUS_BASE_URL') return undefined;
              if (key === 'JOBNIMBUS_API_KEY') return undefined;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRuleSummaries', () => {
    it('should return list of all workflow rules', () => {
      const rules = service.getRuleSummaries();

      expect(rules).toBeDefined();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);

      // Check structure of first rule
      const firstRule = rules[0];
      expect(firstRule).toHaveProperty('key');
      expect(firstRule).toHaveProperty('name');
      expect(firstRule).toHaveProperty('description');
      expect(firstRule).toHaveProperty('department');
      expect(firstRule).toHaveProperty('enabled');
    });

    it('should include rules from all departments', () => {
      const rules = service.getRuleSummaries();
      const departments = new Set(rules.map((r) => r.department));

      expect(departments.has('SALES')).toBe(true);
      expect(departments.has('PRODUCTION')).toBe(true);
      expect(departments.has('ADMIN')).toBe(true);
      expect(departments.has('SAFETY')).toBe(true);
      expect(departments.has('WARRANTY')).toBe(true);
      expect(departments.has('FINANCE')).toBe(true);
    });
  });

  describe('runForJob - deduplication', () => {
    it('should not trigger rule if recently fired', async () => {
      const jobId = 'test-job-123';

      // Mock job exists with jobNimbusId
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: jobId,
        jobNimbusId: 'jn-123',
        status: 'QUALIFIED',
        updatedAt: new Date(Date.now() - 80 * 60 * 60 * 1000), // 80 hours ago
      });

      // Mock recent action exists (dedup should prevent new action)
      (prisma.workflowActionLog.findFirst as jest.Mock).mockResolvedValue({
        id: 'log-1',
        jobId,
        ruleKey: 'SALES_ESTIMATE_FOLLOWUP_72H',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      });

      const actions = await service.runForJob(jobId);

      expect(actions).toEqual([]);
    });
  });

  describe('runForAllActiveJobs', () => {
    it('should process active jobs and return counts', async () => {
      (prisma.job.findMany as jest.Mock).mockResolvedValue([
        { id: 'job1', jobNimbusId: 'jn1', status: 'IN_PROGRESS' },
        { id: 'job2', jobNimbusId: 'jn2', status: 'SCHEDULED' },
      ]);

      // Mock no recent actions so rules can potentially fire
      (prisma.workflowActionLog.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock other dependencies to prevent rules from firing
      (prisma.qCPhotoCheck.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.jobSubcontractorAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.safetyIncident.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.warranty.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.jobFinancialSnapshot.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.jobRiskSnapshot.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.runForAllActiveJobs(10);

      expect(result.processed).toBe(2);
      expect(result.actions).toBeGreaterThanOrEqual(0);
    });

    it('should respect limit parameter', async () => {
      const limit = 5;

      (prisma.job.findMany as jest.Mock).mockResolvedValue([
        { id: 'job1', jobNimbusId: 'jn1', status: 'IN_PROGRESS' },
      ]);

      await service.runForAllActiveJobs(limit);

      expect(prisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: limit,
        })
      );
    });
  });

  describe('getRecentLogs', () => {
    it('should fetch recent logs with default limit', async () => {
      const mockLogs = [
        {
          id: 'log1',
          jobId: 'job1',
          ruleKey: 'SALES_ESTIMATE_FOLLOWUP_72H',
          actionType: 'JOBNIMBUS_TASK',
          createdAt: new Date(),
          metadataJson: { test: 'data' },
        },
      ];

      (prisma.workflowActionLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const logs = await service.getRecentLogs({});

      expect(logs).toHaveLength(1);
      expect(logs[0]?.ruleKey).toBe('SALES_ESTIMATE_FOLLOWUP_72H');
      expect(prisma.workflowActionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should filter logs by jobId', async () => {
      (prisma.workflowActionLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentLogs({ jobId: 'test-job' });

      expect(prisma.workflowActionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jobId: 'test-job' },
        })
      );
    });

    it('should filter logs by ruleKey', async () => {
      (prisma.workflowActionLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentLogs({ ruleKey: 'SALES_ESTIMATE_FOLLOWUP_72H' });

      expect(prisma.workflowActionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { ruleKey: 'SALES_ESTIMATE_FOLLOWUP_72H' },
        })
      );
    });
  });
});
