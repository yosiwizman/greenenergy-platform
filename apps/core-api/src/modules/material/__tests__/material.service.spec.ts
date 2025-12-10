import { Test, TestingModule } from '@nestjs/testing';
import { MaterialService } from '../material.service';
import { prisma } from '@greenenergy/db';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
    },
    materialOrder: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('MaterialService', () => {
  let service: MaterialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialService],
    }).compile();

    service = module.get<MaterialService>(MaterialService);
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a material order successfully', async () => {
      const jobId = 'job-123';
      const payload = {
        supplierName: 'ABC Supply',
        materialName: 'Shingles - GAF Timberline HDZ',
        quantity: 25,
        unit: 'SQ',
        expectedDeliveryDate: '2025-12-20',
      };

      const mockJob = { id: jobId, customerName: 'Test Customer' };
      const mockOrder = {
        id: 'order-123',
        jobId,
        supplierName: payload.supplierName,
        materialName: payload.materialName,
        quantity: payload.quantity,
        unit: payload.unit,
        status: 'PENDING',
        orderNumber: null,
        orderedAt: null,
        expectedDeliveryDate: new Date(payload.expectedDeliveryDate),
        actualDeliveryDate: null,
        trackingUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.materialOrder.create as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.createOrder(jobId, payload);

      expect(result).toMatchObject({
        id: 'order-123',
        jobId,
        supplierName: 'ABC Supply',
        materialName: 'Shingles - GAF Timberline HDZ',
        status: 'PENDING',
        etaStatus: expect.any(String),
      });
      expect(prisma.materialOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId,
          supplierName: payload.supplierName,
          materialName: payload.materialName,
          status: 'PENDING',
        }),
      });
    });

    it('should throw NotFoundException if job does not exist', async () => {
      const jobId = 'non-existent-job';
      const payload = {
        supplierName: 'ABC Supply',
        materialName: 'Shingles',
      };

      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createOrder(jobId, payload)).rejects.toThrow(
        'Job with ID non-existent-job not found',
      );
    });
  });

  describe('ETA status computation', () => {
    it('should return ON_TRACK when order is delivered', async () => {
      const mockOrder = {
        id: 'order-123',
        jobId: 'job-123',
        supplierName: 'ABC Supply',
        materialName: 'Shingles',
        quantity: null,
        unit: null,
        status: 'DELIVERED',
        orderNumber: null,
        orderedAt: null,
        expectedDeliveryDate: new Date('2025-12-20'),
        actualDeliveryDate: new Date('2025-12-19'),
        trackingUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue([mockOrder]);

      const result = await service.listOrders();

      expect(result).toHaveLength(1);
      expect(result[0]?.etaStatus).toBe('ON_TRACK');
    });

    it('should return LATE when expected delivery date is in the past and not delivered', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const mockOrder = {
        id: 'order-123',
        jobId: 'job-123',
        supplierName: 'ABC Supply',
        materialName: 'Shingles',
        quantity: null,
        unit: null,
        status: 'ORDERED',
        orderNumber: null,
        orderedAt: null,
        expectedDeliveryDate: pastDate,
        actualDeliveryDate: null,
        trackingUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue([mockOrder]);

      const result = await service.listOrders();

      expect(result).toHaveLength(1);
      expect(result[0]?.etaStatus).toBe('LATE');
    });

    it('should return AT_RISK when expected delivery is within 3 days', async () => {
      const nearFutureDate = new Date();
      nearFutureDate.setDate(nearFutureDate.getDate() + 2);

      const mockOrder = {
        id: 'order-123',
        jobId: 'job-123',
        supplierName: 'ABC Supply',
        materialName: 'Shingles',
        quantity: null,
        unit: null,
        status: 'SHIPPED',
        orderNumber: null,
        orderedAt: null,
        expectedDeliveryDate: nearFutureDate,
        actualDeliveryDate: null,
        trackingUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue([mockOrder]);

      const result = await service.listOrders();

      expect(result).toHaveLength(1);
      expect(result[0]?.etaStatus).toBe('AT_RISK');
    });

    it('should return AT_RISK when no expected delivery date is set', async () => {
      const mockOrder = {
        id: 'order-123',
        jobId: 'job-123',
        supplierName: 'ABC Supply',
        materialName: 'Shingles',
        quantity: null,
        unit: null,
        status: 'PENDING',
        orderNumber: null,
        orderedAt: null,
        expectedDeliveryDate: null,
        actualDeliveryDate: null,
        trackingUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue([mockOrder]);

      const result = await service.listOrders();

      expect(result).toHaveLength(1);
      expect(result[0]?.etaStatus).toBe('AT_RISK');
    });

    it('should return ON_TRACK when delivery is more than 3 days away', async () => {
      const farFutureDate = new Date();
      farFutureDate.setDate(farFutureDate.getDate() + 10);

      const mockOrder = {
        id: 'order-123',
        jobId: 'job-123',
        supplierName: 'ABC Supply',
        materialName: 'Shingles',
        quantity: null,
        unit: null,
        status: 'ORDERED',
        orderNumber: null,
        orderedAt: null,
        expectedDeliveryDate: farFutureDate,
        actualDeliveryDate: null,
        trackingUrl: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue([mockOrder]);

      const result = await service.listOrders();

      expect(result).toHaveLength(1);
      expect(result[0]?.etaStatus).toBe('ON_TRACK');
    });
  });

  describe('getMaterialSummary', () => {
    it('should compute summary statistics correctly', async () => {
      const mockOrders = [
        {
          id: '1',
          jobId: 'job-1',
          status: 'DELIVERED',
          supplierName: 'ABC',
          materialName: 'Shingles',
          expectedDeliveryDate: new Date(),
          actualDeliveryDate: new Date(),
        },
        {
          id: '2',
          jobId: 'job-2',
          status: 'ORDERED',
          supplierName: 'XYZ',
          materialName: 'Panels',
          expectedDeliveryDate: new Date(),
          actualDeliveryDate: null,
        },
        {
          id: '3',
          jobId: 'job-3',
          status: 'DELAYED',
          supplierName: 'ABC',
          materialName: 'Wire',
          expectedDeliveryDate: new Date(),
          actualDeliveryDate: null,
        },
        {
          id: '4',
          jobId: 'job-4',
          status: 'CANCELLED',
          supplierName: 'DEF',
          materialName: 'Mounting',
          expectedDeliveryDate: null,
          actualDeliveryDate: null,
        },
      ];

      (prisma.materialOrder.findMany as jest.Mock).mockResolvedValue(mockOrders);

      const result = await service.getMaterialSummary();

      expect(result.totalOrders).toBe(4);
      expect(result.deliveredOrders).toBe(1);
      expect(result.openOrders).toBe(2); // ORDERED + DELAYED
      expect(result.delayedOrders).toBeGreaterThanOrEqual(1); // At least the DELAYED one
    });
  });
});
