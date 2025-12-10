import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import type {
  MaterialOrderDTO,
  MaterialSummaryDTO,
  MaterialOrderStatus,
  MaterialEtaStatus,
  CreateMaterialOrderDto,
  UpdateMaterialOrderDto,
} from '@greenenergy/shared-types';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);
  private readonly ETA_AT_RISK_THRESHOLD_DAYS = 3; // Configurable threshold

  /**
   * Create a new material order
   */
  async createOrder(jobId: string, payload: CreateMaterialOrderDto): Promise<MaterialOrderDTO> {
    this.logger.log(`Creating material order for job ${jobId}: ${payload.materialName}`);

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const materialOrder = await prisma.materialOrder.create({
      data: {
        jobId,
        supplierName: payload.supplierName,
        materialName: payload.materialName,
        quantity: payload.quantity,
        unit: payload.unit,
        orderNumber: payload.orderNumber,
        status: 'PENDING', // Default to PENDING
        orderedAt: null,
        expectedDeliveryDate: payload.expectedDeliveryDate
          ? new Date(payload.expectedDeliveryDate)
          : null,
        actualDeliveryDate: null,
        trackingUrl: payload.trackingUrl,
        notes: payload.notes,
      },
    });

    return this.mapToDTO(materialOrder);
  }

  /**
   * Update an existing material order
   */
  async updateOrder(id: string, payload: UpdateMaterialOrderDto): Promise<MaterialOrderDTO> {
    this.logger.log(`Updating material order ${id}`);

    const existing = await prisma.materialOrder.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Material order with ID ${id} not found`);
    }

    const updated = await prisma.materialOrder.update({
      where: { id },
      data: {
        status: payload.status,
        supplierName: payload.supplierName,
        materialName: payload.materialName,
        quantity: payload.quantity,
        unit: payload.unit,
        expectedDeliveryDate: payload.expectedDeliveryDate
          ? new Date(payload.expectedDeliveryDate)
          : undefined,
        actualDeliveryDate: payload.actualDeliveryDate
          ? new Date(payload.actualDeliveryDate)
          : undefined,
        trackingUrl: payload.trackingUrl,
        notes: payload.notes,
      },
    });

    // If status changed to ORDERED and orderedAt is null, set it
    if (payload.status === 'ORDERED' && !updated.orderedAt) {
      await prisma.materialOrder.update({
        where: { id },
        data: { orderedAt: new Date() },
      });
    }

    // TODO: If status is DELAYED, notify JobNimbus with a note
    if (payload.status === 'DELAYED') {
      this.logger.warn(`Material order ${id} marked as DELAYED - JobNimbus integration pending`);
    }

    return this.mapToDTO(await prisma.materialOrder.findUnique({ where: { id } })!);
  }

  /**
   * List material orders with optional filters
   */
  async listOrders(filter?: {
    jobId?: string;
    status?: MaterialOrderStatus;
  }): Promise<MaterialOrderDTO[]> {
    const where: any = {};

    if (filter?.jobId) {
      where.jobId = filter.jobId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    const orders = await prisma.materialOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        job: {
          select: {
            id: true,
            jobNimbusId: true,
            customerName: true,
          },
        },
      },
    });

    return orders.map((order) => this.mapToDTO(order));
  }

  /**
   * Get all material orders for a specific job
   */
  async getOrdersForJob(jobId: string): Promise<MaterialOrderDTO[]> {
    return this.listOrders({ jobId });
  }

  /**
   * Get material summary statistics
   */
  async getMaterialSummary(): Promise<MaterialSummaryDTO> {
    const allOrders = await prisma.materialOrder.findMany();

    const totalOrders = allOrders.length;
    const openOrders = allOrders.filter(
      (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
    ).length;
    const deliveredOrders = allOrders.filter((o) => o.status === 'DELIVERED').length;

    // Delayed orders: status is DELAYED OR computed etaStatus is LATE
    const delayedOrders = allOrders.filter((order) => {
      if (order.status === 'DELAYED') return true;
      const etaStatus = this.computeEtaStatus(order);
      return etaStatus === 'LATE';
    }).length;

    return {
      totalOrders,
      openOrders,
      delayedOrders,
      deliveredOrders,
    };
  }

  /**
   * Map Prisma MaterialOrder to DTO with computed ETA status
   */
  private mapToDTO(order: any): MaterialOrderDTO {
    const etaStatus = this.computeEtaStatus(order);

    return {
      id: order.id,
      jobId: order.jobId,
      supplierName: order.supplierName,
      orderNumber: order.orderNumber || null,
      materialName: order.materialName,
      quantity: order.quantity || null,
      unit: order.unit || null,
      status: order.status as MaterialOrderStatus,
      orderedAt: order.orderedAt ? order.orderedAt.toISOString() : null,
      expectedDeliveryDate: order.expectedDeliveryDate
        ? order.expectedDeliveryDate.toISOString()
        : null,
      actualDeliveryDate: order.actualDeliveryDate ? order.actualDeliveryDate.toISOString() : null,
      trackingUrl: order.trackingUrl || null,
      notes: order.notes || null,
      etaStatus,
    };
  }

  /**
   * Compute ETA status based on dates and current status
   */
  private computeEtaStatus(order: any): MaterialEtaStatus {
    const { status, expectedDeliveryDate, actualDeliveryDate } = order;

    // If delivered, always ON_TRACK
    if (status === 'DELIVERED') {
      return 'ON_TRACK';
    }

    // If no expected delivery date, we can't track - mark as AT_RISK
    if (!expectedDeliveryDate) {
      return 'AT_RISK';
    }

    const now = new Date();
    const expectedDate = new Date(expectedDeliveryDate);

    // If expected date is in the past and not delivered, it's LATE
    if (expectedDate < now && !actualDeliveryDate) {
      return 'LATE';
    }

    // If expected date is within threshold days, mark AT_RISK
    const daysUntilDelivery = Math.ceil(
      (expectedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDelivery <= this.ETA_AT_RISK_THRESHOLD_DAYS && daysUntilDelivery >= 0) {
      return 'AT_RISK';
    }

    // Otherwise, ON_TRACK
    return 'ON_TRACK';
  }
}
