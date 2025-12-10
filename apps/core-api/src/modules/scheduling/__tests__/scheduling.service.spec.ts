import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingService } from '../scheduling.service';
import { MaterialService } from '../../material/material.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

// Mock MaterialService
const mockMaterialService = {
  listOrders: jest.fn(),
  getOrdersForJob: jest.fn(),
};

describe('SchedulingService', () => {
  let service: SchedulingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: MaterialService,
          useValue: mockMaterialService,
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    jest.clearAllMocks();
  });

  describe('getSchedulingOverview', () => {
    it('should compute LOW scheduling risk when no materials and no risk flags', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [],
          riskSnapshot: null,
          subcontractorAssignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result).toHaveLength(1);
      expect(result[0]?.schedulingRiskLevel).toBe('LOW');
      expect(result[0]?.reasons).toContain('No scheduling risks detected');
    });

    it('should compute HIGH scheduling risk when material ETA is LATE', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [
            {
              id: 'order-1',
              status: 'ORDERED',
              expectedDeliveryDate: pastDate,
              actualDeliveryDate: null,
            },
          ],
          riskSnapshot: null,
          subcontractorAssignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result[0]?.schedulingRiskLevel).toBe('HIGH');
      expect(result[0]?.materialEtaStatus).toBe('LATE');
      expect(result[0]?.reasons).toContain('Material delivery late');
    });

    it('should compute MEDIUM scheduling risk when material ETA is AT_RISK', async () => {
      const nearFutureDate = new Date();
      nearFutureDate.setDate(nearFutureDate.getDate() + 2);

      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [
            {
              id: 'order-1',
              status: 'SHIPPED',
              expectedDeliveryDate: nearFutureDate,
              actualDeliveryDate: null,
            },
          ],
          riskSnapshot: null,
          subcontractorAssignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result[0]?.schedulingRiskLevel).toBe('MEDIUM');
      expect(result[0]?.materialEtaStatus).toBe('AT_RISK');
      expect(result[0]?.reasons).toContain('Material delivery at risk');
    });

    it('should compute HIGH scheduling risk when job risk level is HIGH', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [],
          riskSnapshot: {
            riskLevel: 'HIGH',
          },
          subcontractorAssignments: [],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result[0]?.schedulingRiskLevel).toBe('HIGH');
      expect(result[0]?.hasHighRiskFlags).toBe(true);
      expect(result[0]?.reasons).toContain('Job risk level is HIGH');
    });

    it('should compute HIGH scheduling risk when subcontractor status is RED', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [],
          riskSnapshot: null,
          subcontractorAssignments: [
            {
              isPrimary: true,
              unassignedAt: null,
              subcontractor: {
                name: 'ABC Subcontractor',
                performanceStatus: 'RED',
              },
            },
          ],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result[0]?.schedulingRiskLevel).toBe('HIGH');
      expect(result[0]?.subcontractorStatus).toBe('RED');
      expect(result[0]?.reasons).toContain('Subcontractor status RED');
    });

    it('should compute MEDIUM scheduling risk when subcontractor status is YELLOW', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [],
          riskSnapshot: null,
          subcontractorAssignments: [
            {
              isPrimary: true,
              unassignedAt: null,
              subcontractor: {
                name: 'ABC Subcontractor',
                performanceStatus: 'YELLOW',
              },
            },
          ],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result[0]?.schedulingRiskLevel).toBe('MEDIUM');
      expect(result[0]?.subcontractorStatus).toBe('YELLOW');
      expect(result[0]?.reasons).toContain('Subcontractor status YELLOW');
    });

    it('should upgrade to highest risk level when multiple factors present', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockJobs = [
        {
          id: 'job-1',
          jobNimbusId: 'JN-001',
          customerName: 'John Doe',
          status: 'IN_PROGRESS',
          materialOrders: [
            {
              id: 'order-1',
              status: 'ORDERED',
              expectedDeliveryDate: pastDate,
              actualDeliveryDate: null,
            },
          ],
          riskSnapshot: {
            riskLevel: 'HIGH',
          },
          subcontractorAssignments: [
            {
              isPrimary: true,
              unassignedAt: null,
              subcontractor: {
                name: 'ABC Subcontractor',
                performanceStatus: 'RED',
              },
            },
          ],
        },
      ];

      (prisma.job.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await service.getSchedulingOverview();

      expect(result[0]?.schedulingRiskLevel).toBe('HIGH');
      expect(result[0]?.reasons.length).toBeGreaterThanOrEqual(3);
      expect(result[0]?.reasons).toContain('Material delivery late');
      expect(result[0]?.reasons).toContain('Job risk level is HIGH');
      expect(result[0]?.reasons).toContain('Subcontractor status RED');
    });
  });

  describe('getSchedulingForJob', () => {
    it('should return scheduling risk for a specific job', async () => {
      const mockJob = {
        id: 'job-1',
        jobNimbusId: 'JN-001',
        customerName: 'John Doe',
        status: 'IN_PROGRESS',
        materialOrders: [],
        riskSnapshot: null,
        subcontractorAssignments: [],
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);

      const result = await service.getSchedulingForJob('job-1');

      expect(result).toBeDefined();
      expect(result?.jobId).toBe('job-1');
      expect(result?.schedulingRiskLevel).toBeDefined();
    });

    it('should throw NotFoundException if job not found', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getSchedulingForJob('non-existent')).rejects.toThrow(
        'Job with ID non-existent not found',
      );
    });
  });
});
