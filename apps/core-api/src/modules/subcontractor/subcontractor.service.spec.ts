import { ConfigService } from '@nestjs/config';
import { SubcontractorService } from './subcontractor.service';
import { prisma } from '@greenenergy/db';
import { ConflictException } from '@nestjs/common';

// Mock prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    subcontractor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    job: {
      findUnique: jest.fn(),
    },
    jobSubcontractorAssignment: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    qCPhotoCheck: {
      count: jest.fn(),
    },
    safetyIncident: {
      count: jest.fn(),
    },
  },
}));

describe('SubcontractorService', () => {
  let service: SubcontractorService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'JOBNIMBUS_BASE_URL':
            return 'https://api.jobnimbus.com';
          case 'JOBNIMBUS_API_KEY':
            return 'test-api-key';
          default:
            return null;
        }
      }),
    } as any;

    service = new SubcontractorService(mockConfigService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Compliance Evaluation', () => {
    it('should return compliant status when all requirements are met', async () => {
      const mockSubcontractor = {
        id: 'sub-1',
        name: 'Test Subcontractor',
        licenseNumber: 'LIC-12345',
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        insurancePolicyNumber: 'INS-67890',
        insuranceExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        w9Received: true,
        coiReceived: true,
        lastComplianceStatus: null,
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        lastComplianceStatus: 'COMPLIANT',
      });

      const result = await service.evaluateCompliance('sub-1');

      expect(result.isCompliant).toBe(true);
      expect(result.hasValidLicense).toBe(true);
      expect(result.hasValidInsurance).toBe(true);
      expect(result.hasW9).toBe(true);
      expect(result.hasCOI).toBe(true);
      expect(result.missingItems).toHaveLength(0);
    });

    it('should return non-compliant when license is expired', async () => {
      const mockSubcontractor = {
        id: 'sub-2',
        name: 'Test Subcontractor',
        licenseNumber: 'LIC-12345',
        licenseExpiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        insurancePolicyNumber: 'INS-67890',
        insuranceExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        w9Received: true,
        coiReceived: true,
        lastComplianceStatus: 'COMPLIANT',
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        lastComplianceStatus: 'NON_COMPLIANT',
      });

      const result = await service.evaluateCompliance('sub-2');

      expect(result.isCompliant).toBe(false);
      expect(result.hasValidLicense).toBe(false);
      expect(result.missingItems).toContain('LICENSE_EXPIRED');
    });

    it('should return non-compliant when insurance is missing', async () => {
      const mockSubcontractor = {
        id: 'sub-3',
        name: 'Test Subcontractor',
        licenseNumber: 'LIC-12345',
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        insurancePolicyNumber: null,
        insuranceExpiresAt: null,
        w9Received: true,
        coiReceived: true,
        lastComplianceStatus: null,
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        lastComplianceStatus: 'NON_COMPLIANT',
      });

      const result = await service.evaluateCompliance('sub-3');

      expect(result.isCompliant).toBe(false);
      expect(result.hasValidInsurance).toBe(false);
      expect(result.missingItems).toContain('INSURANCE_MISSING');
    });

    it('should return non-compliant when W9 is not received', async () => {
      const mockSubcontractor = {
        id: 'sub-4',
        name: 'Test Subcontractor',
        licenseNumber: 'LIC-12345',
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        insurancePolicyNumber: 'INS-67890',
        insuranceExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        w9Received: false,
        coiReceived: true,
        lastComplianceStatus: null,
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        lastComplianceStatus: 'NON_COMPLIANT',
      });

      const result = await service.evaluateCompliance('sub-4');

      expect(result.isCompliant).toBe(false);
      expect(result.hasW9).toBe(false);
      expect(result.missingItems).toContain('W9_MISSING');
    });

    it('should return non-compliant when COI is not received', async () => {
      const mockSubcontractor = {
        id: 'sub-5',
        name: 'Test Subcontractor',
        licenseNumber: 'LIC-12345',
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        insurancePolicyNumber: 'INS-67890',
        insuranceExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        w9Received: true,
        coiReceived: false,
        lastComplianceStatus: null,
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        lastComplianceStatus: 'NON_COMPLIANT',
      });

      const result = await service.evaluateCompliance('sub-5');

      expect(result.isCompliant).toBe(false);
      expect(result.hasCOI).toBe(false);
      expect(result.missingItems).toContain('COI_MISSING');
    });

    it('should identify multiple missing items', async () => {
      const mockSubcontractor = {
        id: 'sub-6',
        name: 'Test Subcontractor',
        licenseNumber: null,
        licenseExpiresAt: null,
        insurancePolicyNumber: null,
        insuranceExpiresAt: null,
        w9Received: false,
        coiReceived: false,
        lastComplianceStatus: null,
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        lastComplianceStatus: 'NON_COMPLIANT',
      });

      const result = await service.evaluateCompliance('sub-6');

      expect(result.isCompliant).toBe(false);
      expect(result.missingItems).toHaveLength(4);
      expect(result.missingItems).toContain('LICENSE_MISSING');
      expect(result.missingItems).toContain('INSURANCE_MISSING');
      expect(result.missingItems).toContain('W9_MISSING');
      expect(result.missingItems).toContain('COI_MISSING');
    });
  });

  describe('Performance Scoring', () => {
    it('should return score of 100 when no issues exist', async () => {
      const mockSubcontractor = {
        id: 'sub-1',
        name: 'Test Subcontractor',
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.jobSubcontractorAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(0);
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        performanceScore: 100,
        performanceStatus: 'GREEN',
      });

      const result = await service.evaluateSubcontractorPerformance('sub-1');

      expect(result.score).toBe(100);
      expect(result.status).toBe('GREEN');
      expect(result.factors).toHaveLength(0);
    });

    it('should deduct 5 points per QC failure', async () => {
      const mockSubcontractor = {
        id: 'sub-2',
        name: 'Test Subcontractor',
      };

      const mockAssignments = [{ jobId: 'job-1' }, { jobId: 'job-2' }];

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.jobSubcontractorAssignment.findMany as jest.Mock).mockResolvedValue(mockAssignments);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(3); // 3 QC failures
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(0);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        performanceScore: 85,
        performanceStatus: 'GREEN',
      });

      const result = await service.evaluateSubcontractorPerformance('sub-2');

      expect(result.score).toBe(85); // 100 - (3 * 5)
      expect(result.status).toBe('GREEN'); // >= 85
      expect(result.factors).toHaveLength(1);
      expect(result.factors[0]?.label).toContain('QC Failures');
      expect(result.factors[0]?.value).toBe(3);
      expect(result.factors[0]?.weight).toBe(5);
    });

    it('should deduct 10 points per safety incident', async () => {
      const mockSubcontractor = {
        id: 'sub-3',
        name: 'Test Subcontractor',
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.jobSubcontractorAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(0);
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(2); // 2 safety incidents
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        performanceScore: 80,
        performanceStatus: 'YELLOW',
      });

      const result = await service.evaluateSubcontractorPerformance('sub-3');

      expect(result.score).toBe(80); // 100 - (2 * 10)
      expect(result.status).toBe('YELLOW'); // 70 <= score < 85
      expect(result.factors).toHaveLength(1);
      expect(result.factors[0]?.label).toContain('Safety Incidents');
      expect(result.factors[0]?.value).toBe(2);
      expect(result.factors[0]?.weight).toBe(10);
    });

    it('should return RED status for score < 70', async () => {
      const mockSubcontractor = {
        id: 'sub-4',
        name: 'Test Subcontractor',
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.jobSubcontractorAssignment.findMany as jest.Mock).mockResolvedValue([
        { jobId: 'job-1' },
      ]);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(5); // 5 QC failures
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(3); // 3 safety incidents
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        performanceScore: 45,
        performanceStatus: 'RED',
      });

      const result = await service.evaluateSubcontractorPerformance('sub-4');

      expect(result.score).toBe(45); // 100 - (5 * 5) - (3 * 10)
      expect(result.status).toBe('RED'); // score < 70
      expect(result.factors).toHaveLength(2);
    });

    it('should clamp score to minimum of 0', async () => {
      const mockSubcontractor = {
        id: 'sub-5',
        name: 'Test Subcontractor',
      };

      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.jobSubcontractorAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.qCPhotoCheck.count as jest.Mock).mockResolvedValue(50); // Extreme case
      (prisma.safetyIncident.count as jest.Mock).mockResolvedValue(10);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue({
        ...mockSubcontractor,
        performanceScore: 0,
        performanceStatus: 'RED',
      });

      const result = await service.evaluateSubcontractorPerformance('sub-5');

      expect(result.score).toBe(0); // Clamped to 0
      expect(result.status).toBe('RED');
    });
  });

  describe('Job Assignment with Compliance Guard', () => {
    it('should block assignment of non-compliant subcontractor', async () => {
      const mockJob = { id: 'job-1', customerName: 'Test Customer' };
      const mockSubcontractor = {
        id: 'sub-1',
        name: 'Test Subcontractor',
        isActive: true,
        licenseNumber: null,
        licenseExpiresAt: null,
        insurancePolicyNumber: null,
        insuranceExpiresAt: null,
        w9Received: false,
        coiReceived: false,
        lastComplianceStatus: 'NON_COMPLIANT',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue(mockSubcontractor);

      await expect(
        service.assignSubcontractorToJob('job-1', {
          subcontractorId: 'sub-1',
          role: 'ROOF_INSTALL',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should allow assignment of compliant subcontractor', async () => {
      const mockJob = { id: 'job-1', customerName: 'Test Customer' };
      const mockSubcontractor = {
        id: 'sub-1',
        name: 'Test Subcontractor',
        isActive: true,
        licenseNumber: 'LIC-123',
        licenseExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        insurancePolicyNumber: 'INS-456',
        insuranceExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        w9Received: true,
        coiReceived: true,
        lastComplianceStatus: 'COMPLIANT',
      };

      const mockAssignment = {
        id: 'assignment-1',
        jobId: 'job-1',
        subcontractorId: 'sub-1',
        role: 'ROOF_INSTALL',
        isPrimary: false,
        assignedAt: new Date(),
        subcontractor: mockSubcontractor,
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.subcontractor.findUnique as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.subcontractor.update as jest.Mock).mockResolvedValue(mockSubcontractor);
      (prisma.jobSubcontractorAssignment.create as jest.Mock).mockResolvedValue(mockAssignment);

      const result = await service.assignSubcontractorToJob('job-1', {
        subcontractorId: 'sub-1',
        role: 'ROOF_INSTALL',
      });

      expect(result).toBeDefined();
      expect(result.jobId).toBe('job-1');
      expect(result.subcontractorId).toBe('sub-1');
      expect(result.role).toBe('ROOF_INSTALL');
    });
  });
});
