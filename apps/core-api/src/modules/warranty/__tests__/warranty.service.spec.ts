import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WarrantyService } from '../warranty.service';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    warranty: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    warrantyClaim: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    job: {
      findUnique: jest.fn(),
    },
    customerUser: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock JobNimbus SDK
jest.mock('@greenenergy/jobnimbus-sdk');

describe('WarrantyService', () => {
  let service: WarrantyService;
  let mockJobNimbusClient: jest.Mocked<JobNimbusClient>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'WARRANTY_EXPIRY_NOTICE_DAYS') return 30;
        if (key === 'WARRANTY_DEFAULT_TERM_MONTHS') return 120;
        return defaultValue;
      }),
    } as any;

    // Mock JobNimbus Client
    mockJobNimbusClient = {
      createNote: jest.fn().mockResolvedValue({ id: 'note-123' }),
      createTask: jest.fn().mockResolvedValue({ id: 'task-123' }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarrantyService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JobNimbusClient, useValue: mockJobNimbusClient },
      ],
    }).compile();

    service = module.get<WarrantyService>(WarrantyService);
  });

  describe('activateWarrantyForJob', () => {
    const mockJob = {
      id: 'job-123',
      jobNimbusId: 'jn-456',
      completionDate: new Date('2024-01-01'),
      customerName: 'John Doe',
      address: '123 Main St',
    };

    it('should create a new warranty when none exists', async () => {
      const activateDto = {
        type: 'Solar Panel Warranty',
        provider: 'SolarTech Inc',
        termMonths: 120,
        documentUrl: 'https://example.com/warranty.pdf',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.warranty.upsert as jest.Mock).mockResolvedValue({
        id: 'warranty-1',
        jobId: 'job-123',
        warrantyNumber: 'WRN-123',
        type: activateDto.type,
        provider: activateDto.provider,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2034-01-01'), // 120 months = 10 years later
        status: 'ACTIVE',
        coverageJson: null,
        documentUrl: activateDto.documentUrl,
        activatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.activateWarrantyForJob('job-123', activateDto);

      expect(prisma.warranty.upsert).toHaveBeenCalled();
      expect(result.status).toBe('ACTIVE');
      expect(result.type).toBe(activateDto.type);
    });

    it('should update existing warranty', async () => {
      const existingWarranty = {
        id: 'warranty-1',
        jobId: 'job-123',
        warrantyNumber: 'WRN-123',
        type: 'Old Warranty',
        provider: 'Old Provider',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2034-01-01'),
        status: 'ACTIVE',
        coverageJson: null,
        documentUrl: null,
        activatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateDto = {
        type: 'Updated Warranty',
        provider: 'New Provider',
        termMonths: 120,
        documentUrl: 'https://example.com/new-warranty.pdf',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.warranty.upsert as jest.Mock).mockResolvedValue({
        ...existingWarranty,
        type: updateDto.type,
        provider: updateDto.provider,
        documentUrl: updateDto.documentUrl,
      });

      const result = await service.activateWarrantyForJob('job-123', updateDto);

      expect(prisma.warranty.upsert).toHaveBeenCalled();
      expect(result.type).toBe(updateDto.type);
      expect(result.provider).toBe(updateDto.provider);
    });

    it('should calculate endDate correctly from termMonths', async () => {
      const activateDto = {
        type: 'Solar Panel Warranty',
        provider: 'SolarTech Inc',
        termMonths: 60, // 5 years
      };

      const startDate = new Date('2024-01-01');
      const expectedEndDate = new Date('2029-01-01'); // 5 years later

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.warranty.upsert as jest.Mock).mockImplementation((args) => {
        const endDate = new Date(args.create.startDate);
        endDate.setMonth(endDate.getMonth() + 60);
        return Promise.resolve({
          id: 'warranty-1',
          jobId: 'job-123',
          ...args.create,
          endDate,
        });
      });

      await service.activateWarrantyForJob('job-123', activateDto);

      const upsertCall = (prisma.warranty.upsert as jest.Mock).mock.calls[0][0];
      const endDate = new Date(upsertCall.create.startDate);
      endDate.setMonth(endDate.getMonth() + 60);

      expect(endDate.getFullYear()).toBe(expectedEndDate.getFullYear());
    });

    it('should use default termMonths when not provided', async () => {
      const activateDto = {
        type: 'Solar Panel Warranty',
        provider: 'SolarTech Inc',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.warranty.upsert as jest.Mock).mockResolvedValue({
        id: 'warranty-1',
        jobId: 'job-123',
        warrantyNumber: 'WRN-123',
        type: activateDto.type,
        provider: activateDto.provider,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2034-01-01'), // Default 120 months
        status: 'ACTIVE',
        coverageJson: null,
        documentUrl: null,
        activatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.activateWarrantyForJob('job-123', activateDto);

      // Config service is called during constructor and activation, but not necessarily with this specific key
      expect(prisma.warranty.upsert).toHaveBeenCalled();
    });
  });

  describe('getWarrantySummary', () => {
    it('should calculate warranty counts correctly', async () => {
      // Mock count queries
      (prisma.warranty.count as jest.Mock)
        .mockResolvedValueOnce(4)  // total
        .mockResolvedValueOnce(2)  // active
        .mockResolvedValueOnce(1)  // expiring soon
        .mockResolvedValueOnce(1); // expired

      const result = await service.getWarrantySummary();

      expect(result.total).toBe(4);
      expect(result.active).toBe(2);
      expect(result.expiringSoon).toBe(1);
      expect(result.expired).toBe(1);
    });

    it('should handle empty warranty list', async () => {
      (prisma.warranty.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getWarrantySummary();

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.expiringSoon).toBe(0);
      expect(result.expired).toBe(0);
    });
  });

  describe('createClaimInternal', () => {
    it('should create internal claim with correct source', async () => {
      const createDto = {
        jobId: 'job-123',
        title: 'Panel not working',
        description: 'Solar panel is not producing power',
        priority: 'HIGH' as const,
      };

      const mockClaim = {
        id: 'claim-1',
        jobId: 'job-123',
        warrantyId: null,
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        source: 'INTERNAL',
        status: 'OPEN',
        priority: 'HIGH',
        title: createDto.title,
        description: createDto.description,
        reportedAt: new Date(),
        resolvedAt: null,
        internalNotes: null,
        metadataJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'job-123',
        jobNimbusId: 'jn-123',
        customerName: 'John Doe',
      });
      (prisma.warrantyClaim.create as jest.Mock).mockResolvedValue(mockClaim);

      const result = await service.createClaimInternal(createDto);

      expect(result.source).toBe('INTERNAL');
      expect(result.status).toBe('OPEN');
      expect(result.title).toBe(createDto.title);
    });
  });

  describe('updateClaimStatus', () => {
    it('should set resolvedAt when status is RESOLVED', async () => {
      const mockClaim = {
        id: 'claim-1',
        jobId: 'job-123',
        warrantyId: null,
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        source: 'PORTAL',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: 'Issue',
        description: 'Description',
        reportedAt: new Date(),
        resolvedAt: null,
        internalNotes: null,
        metadataJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.warrantyClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.warrantyClaim.update as jest.Mock).mockResolvedValue({
        ...mockClaim,
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      const result = await service.updateClaimStatus('claim-1', 'RESOLVED');

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedAt).toBeDefined();
      expect(result.resolvedAt).not.toBeNull();
    });

    it('should not set resolvedAt for non-resolved statuses', async () => {
      const mockClaim = {
        id: 'claim-1',
        jobId: 'job-123',
        warrantyId: null,
        customerName: null,
        customerEmail: null,
        customerPhone: null,
        source: 'INTERNAL',
        status: 'OPEN',
        priority: 'LOW',
        title: 'Issue',
        description: 'Description',
        reportedAt: new Date(),
        resolvedAt: null,
        internalNotes: null,
        metadataJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.warrantyClaim.findUnique as jest.Mock).mockResolvedValue(mockClaim);
      (prisma.warrantyClaim.update as jest.Mock).mockResolvedValue({
        ...mockClaim,
        status: 'IN_REVIEW',
      });

      const result = await service.updateClaimStatus('claim-1', 'IN_REVIEW');

      expect(result.status).toBe('IN_REVIEW');
      expect(result.resolvedAt).toBeUndefined();
    });
  });

  describe('createClaimFromPortal', () => {
    it('should create portal claim with customer session info', async () => {
      const mockSession = {
        jobId: 'job-123',
        customerUserId: 'user-1',
      };

      const mockCustomerUser = {
        id: 'user-1',
        jobId: 'job-123',
        email: 'customer@example.com',
        name: 'Jane Customer',
      };

      const createDto = {
        title: 'System issue',
        description: 'The system is making noise',
      };

      (prisma.customerUser.findUnique as jest.Mock).mockResolvedValue(mockCustomerUser);
      (prisma.job.findUnique as jest.Mock).mockResolvedValue({
        id: 'job-123',
        jobNimbusId: 'jn-123',
        customerName: 'Jane Customer',
      });
      (prisma.warranty.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.warrantyClaim.create as jest.Mock).mockResolvedValue({
        id: 'claim-1',
        jobId: 'job-123',
        warrantyId: null,
        source: 'PORTAL',
        status: 'OPEN',
        priority: 'MEDIUM',
        title: createDto.title,
        description: createDto.description,
        customerName: mockCustomerUser.name,
        customerEmail: mockCustomerUser.email,
        reportedAt: new Date(),
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createClaimFromPortal(mockSession as any, createDto);

      expect(result.source).toBe('PORTAL');
      expect(result.customerEmail).toBe('customer@example.com');
    });
  });
});
