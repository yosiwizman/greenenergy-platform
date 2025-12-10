import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MaterialService } from './material.service';
import type {
  MaterialOrderDTO,
  MaterialSummaryDTO,
  MaterialOrderStatus,
  CreateMaterialOrderDto,
  UpdateMaterialOrderDto,
} from '@greenenergy/shared-types';

@Controller('api/v1/material-orders')
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  /**
   * POST /api/v1/material-orders/jobs/:jobId
   * Create a new material order for a job
   */
  @Post('jobs/:jobId')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Param('jobId') jobId: string,
    @Body() payload: CreateMaterialOrderDto,
  ): Promise<MaterialOrderDTO> {
    return this.materialService.createOrder(jobId, payload);
  }

  /**
   * PATCH /api/v1/material-orders/:id
   * Update an existing material order
   */
  @Patch(':id')
  async updateOrder(
    @Param('id') id: string,
    @Body() payload: UpdateMaterialOrderDto,
  ): Promise<MaterialOrderDTO> {
    return this.materialService.updateOrder(id, payload);
  }

  /**
   * GET /api/v1/material-orders
   * List all material orders with optional filters
   */
  @Get()
  async listOrders(
    @Query('jobId') jobId?: string,
    @Query('status') status?: MaterialOrderStatus,
  ): Promise<MaterialOrderDTO[]> {
    return this.materialService.listOrders({ jobId, status });
  }

  /**
   * GET /api/v1/material-orders/jobs/:jobId
   * Get all material orders for a specific job
   */
  @Get('jobs/:jobId')
  async getOrdersForJob(@Param('jobId') jobId: string): Promise<MaterialOrderDTO[]> {
    return this.materialService.getOrdersForJob(jobId);
  }

  /**
   * GET /api/v1/material-orders/summary
   * Get material order summary statistics
   */
  @Get('summary')
  async getSummary(): Promise<MaterialSummaryDTO> {
    return this.materialService.getMaterialSummary();
  }
}
