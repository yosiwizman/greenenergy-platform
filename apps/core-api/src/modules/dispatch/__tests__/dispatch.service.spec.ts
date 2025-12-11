import { Test, TestingModule } from '@nestjs/testing';
import { DispatchService } from '../dispatch.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    subcontractor: {
      findMany: jest.fn(),
    },
    jobSubcontractorAssignment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('DispatchService', () => {
  let service: DispatchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DispatchService],
    }).compile();

    service = module.get<DispatchService>(DispatchService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverviewForDate', () => {
    it('should return dispatch overview with recommendations', async () => {
      const mockJobs = [
        {
          id: 'job1',
          jobNimbusId: 'JN001',
          customerName: 'Customer A',
          city: 'Phoenix',
          address: '123 Main St',
          status: 'SCHEDULED',
          scheduledDate: new Date('2024-01-15'),
          systemSize: 10.5,
          riskSnapshot: { riskLevel: 'LOW' },
          financialSnapshot: { marginPercent: 20 },
          materialOrders: [
            {
              status: 'DELIVERED',
              expectedDeliveryDate: new Date('2024-01-10'),
            },
          ],
          qcPhotoChecks: [],
          safetyIncidents: [],
        },
      ];

      const mockSubcontractors = [
        {
          id: 'sub1',
          name: 'Green Crew A',
          isActive: true,
          performanceStatus: 'GREEN',
          lastComplianceStatus: 'COMPLIANT',
          maxConcurrentJobs: 3,
          homeBaseCity: 'Phoenix',
          assignments: [],
        },
        {
          id: 'sub2',
          name: 'Yellow Crew B',
          isActive: true,
          performanceStatus: 'YELLOW',
          lastComplianceStatus: 'COMPLIANT',
          maxConcurrentJobs: 2,
          homeBaseCity: null,
          assignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.subcontractor.findMany as jest.Mock).mockResolvedValue(mockSubcontractors);

      const result = await service.getOverviewForDate(new Date('2024-01-15'));

      expect(result).toBeDefined();
      expect(result.jobsTotal).toBe(1);
      expect(result.jobsDispatchable).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0]?.job.jobId).toBe('job1');
      expect(result.recommendations[0]?.recommendedSubcontractor).toBeDefined();
      expect(result.recommendations[0]?.recommendedSubcontractor?.subcontractorId).toBe('sub1'); // GREEN sub preferred
    });

    it('should mark jobs as blocked when materials are late', async () => {
      const now = new Date();
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - 5);

      const mockJobs = [
        {
          id: 'job1',
          jobNimbusId: 'JN001',
          customerName: 'Customer A',
          city: 'Phoenix',
          address: '123 Main St',
          status: 'SCHEDULED',
          scheduledDate: new Date('2024-01-15'),
          systemSize: 10.5,
          riskSnapshot: { riskLevel: 'LOW' },
          financialSnapshot: { marginPercent: 20 },
          materialOrders: [
            {
              status: 'ORDERED',
              expectedDeliveryDate: pastDate, // Past date, not delivered
            },
          ],
          qcPhotoChecks: [],
          safetyIncidents: [],
        },
      ];

      const mockSubcontractors = [
        {
          id: 'sub1',
          name: 'Green Crew A',
          isActive: true,
          performanceStatus: 'GREEN',
          lastComplianceStatus: 'COMPLIANT',
          maxConcurrentJobs: 3,
          homeBaseCity: 'Phoenix',
          assignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.subcontractor.findMany as jest.Mock).mockResolvedValue(mockSubcontractors);

      const result = await service.getOverviewForDate(new Date('2024-01-15'));

      expect(result.jobsBlocked).toBe(1);
      expect(result.jobsDispatchable).toBe(0);
      expect(result.recommendations[0]?.canStart).toBe(false);
      expect(result.recommendations[0]?.blockingReasons).toContain('MATERIALS_NOT_READY');
    });

    it('should exclude non-compliant subcontractors from recommendations', async () => {
      const mockJobs = [
        {
          id: 'job1',
          jobNimbusId: 'JN001',
          customerName: 'Customer A',
          city: 'Phoenix',
          address: '123 Main St',
          status: 'SCHEDULED',
          scheduledDate: new Date('2024-01-15'),
          systemSize: 10.5,
          riskSnapshot: { riskLevel: 'LOW' },
          financialSnapshot: { marginPercent: 20 },
          materialOrders: [],
          qcPhotoChecks: [],
          safetyIncidents: [],
        },
      ];

      const mockSubcontractors = [
        {
          id: 'sub1',
          name: 'Non-Compliant Crew',
          isActive: true,
          performanceStatus: 'GREEN',
          lastComplianceStatus: 'NON_COMPLIANT',
          maxConcurrentJobs: 3,
          homeBaseCity: 'Phoenix',
          assignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.subcontractor.findMany as jest.Mock).mockResolvedValue(mockSubcontractors);

      const result = await service.getOverviewForDate(new Date('2024-01-15'));

      expect(result.recommendations[0]?.recommendedSubcontractor).toBeNull();
      expect(result.recommendations[0]?.alternatives).toHaveLength(0);
    });

    it('should exclude RED performance subcontractors', async () => {
      const mockJobs = [
        {
          id: 'job1',
          jobNimbusId: 'JN001',
          customerName: 'Customer A',
          city: 'Phoenix',
          address: '123 Main St',
          status: 'SCHEDULED',
          scheduledDate: new Date('2024-01-15'),
          systemSize: 10.5,
          riskSnapshot: { riskLevel: 'LOW' },
          financialSnapshot: { marginPercent: 20 },
          materialOrders: [],
          qcPhotoChecks: [],
          safetyIncidents: [],
        },
      ];

      const mockSubcontractors = [
        {
          id: 'sub1',
          name: 'Red Crew',
          isActive: true,
          performanceStatus: 'RED',
          lastComplianceStatus: 'COMPLIANT',
          maxConcurrentJobs: 3,
          homeBaseCity: 'Phoenix',
          assignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.subcontractor.findMany as jest.Mock).mockResolvedValue(mockSubcontractors);

      const result = await service.getOverviewForDate(new Date('2024-01-15'));

      expect(result.recommendations[0]?.recommendedSubcontractor).toBeNull();
    });

    it('should exclude subcontractors at capacity', async () => {
      const targetDate = new Date('2024-01-15');

      const mockJobs = [
        {
          id: 'job1',
          jobNimbusId: 'JN001',
          customerName: 'Customer A',
          city: 'Phoenix',
          address: '123 Main St',
          status: 'SCHEDULED',
          scheduledDate: targetDate,
          systemSize: 10.5,
          riskSnapshot: { riskLevel: 'LOW' },
          financialSnapshot: { marginPercent: 20 },
          materialOrders: [],
          qcPhotoChecks: [],
          safetyIncidents: [],
        },
      ];

      const mockSubcontractors = [
        {
          id: 'sub1',
          name: 'Busy Crew',
          isActive: true,
          performanceStatus: 'GREEN',
          lastComplianceStatus: 'COMPLIANT',
          maxConcurrentJobs: 1,
          homeBaseCity: 'Phoenix',
          assignments: [
            {
              job: {
                scheduledDate: targetDate,
                status: 'SCHEDULED',
              },
            },
          ],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.subcontractor.findMany as jest.Mock).mockResolvedValue(mockSubcontractors);

      const result = await service.getOverviewForDate(targetDate);

      expect(result.recommendations[0]?.recommendedSubcontractor).toBeNull();
    });
  });

  describe('getRecommendationsForJob', () => {
    it('should return recommendation for single job', async () => {
      const mockJob = {
        id: 'job1',
        jobNimbusId: 'JN001',
        customerName: 'Customer A',
        city: 'Phoenix',
        address: '123 Main St',
        status: 'SCHEDULED',
        scheduledDate: new Date('2024-01-15'),
        systemSize: 10.5,
        riskSnapshot: { riskLevel: 'LOW' },
        financialSnapshot: { marginPercent: 20 },
        materialOrders: [],
        qcPhotoChecks: [],
        safetyIncidents: [],
      };

      const mockSubcontractors = [
        {
          id: 'sub1',
          name: 'Green Crew A',
          isActive: true,
          performanceStatus: 'GREEN',
          lastComplianceStatus: 'COMPLIANT',
          maxConcurrentJobs: 3,
          homeBaseCity: 'Phoenix',
          assignments: [],
        },
      ];

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.subcontractor.findMany as jest.Mock).mockResolvedValue(mockSubcontractors);

      const result = await service.getRecommendationsForJob('job1', new Date('2024-01-15'));

      expect(result).toBeDefined();
      expect(result?.job.jobId).toBe('job1');
      expect(result?.recommendedSubcontractor).toBeDefined();
      expect(result?.recommendedSubcontractor?.confidence).toBe('HIGH');
    });

    it('should return null for non-existent job', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getRecommendationsForJob('invalid-job-id');

      expect(result).toBeNull();
    });
  });

  describe('assignSubcontractorToJob', () => {
    it('should assign subcontractor and update scheduled date', async () => {
      const jobId = 'job1';
      const subcontractorId = 'sub1';
      const scheduledDate = new Date('2024-01-15');

      (prisma.jobSubcontractorAssignment.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.job.update as jest.Mock).mockResolvedValue({});
      (prisma.jobSubcontractorAssignment.create as jest.Mock).mockResolvedValue({});

      await service.assignSubcontractorToJob(jobId, subcontractorId, scheduledDate);

      expect(prisma.job.update).toHaveBeenCalledWith({
        where: { id: jobId },
        data: { scheduledDate },
      });

      expect(prisma.jobSubcontractorAssignment.create).toHaveBeenCalledWith({
        data: {
          jobId,
          subcontractorId,
          isPrimary: true,
          role: 'DISPATCH_ASSIGNED',
        },
      });
    });

    it('should not create duplicate assignment if already exists', async () => {
      const jobId = 'job1';
      const subcontractorId = 'sub1';
      const scheduledDate = new Date('2024-01-15');

      (prisma.jobSubcontractorAssignment.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-assignment',
      });
      (prisma.job.update as jest.Mock).mockResolvedValue({});

      await service.assignSubcontractorToJob(jobId, subcontractorId, scheduledDate);

      expect(prisma.job.update).toHaveBeenCalled();
      expect(prisma.jobSubcontractorAssignment.create).not.toHaveBeenCalled();
    });
  });
});
