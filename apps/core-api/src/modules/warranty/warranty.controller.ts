import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WarrantyService } from './warranty.service';
import type {
  WarrantyDTO,
  WarrantyStatus,
  WarrantyClaimDTO,
  WarrantyClaimStatus,
  WarrantyClaimPriority,
  WarrantySummaryDTO,
} from '@greenenergy/shared-types';

@Controller('/api/v1/warranty')
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  /**
   * Activate warranty for a job
   * POST /api/v1/warranty/jobs/:jobId/activate
   */
  @Post('jobs/:jobId/activate')
  @HttpCode(HttpStatus.OK)
  async activateWarranty(
    @Param('jobId') jobId: string,
    @Body()
    body: {
      type: string;
      provider?: string;
      termMonths?: number;
      coverageJson?: any;
      warrantyNumber?: string;
      documentUrl?: string;
    }
  ): Promise<WarrantyDTO> {
    return this.warrantyService.activateWarrantyForJob(jobId, body);
  }

  /**
   * Get warranty for a specific job
   * GET /api/v1/warranty/jobs/:jobId
   */
  @Get('jobs/:jobId')
  async getJobWarranty(@Param('jobId') jobId: string): Promise<WarrantyDTO | null> {
    return this.warrantyService.getWarrantyForJob(jobId);
  }

  /**
   * List warranties with optional filters
   * GET /api/v1/warranty
   */
  @Get()
  async listWarranties(
    @Query('status') status?: WarrantyStatus,
    @Query('fromEndDate') fromEndDate?: string,
    @Query('toEndDate') toEndDate?: string
  ): Promise<WarrantyDTO[]> {
    return this.warrantyService.listWarranties({
      status,
      fromEndDate,
      toEndDate,
    });
  }

  /**
   * Get warranty summary statistics
   * GET /api/v1/warranty/summary
   */
  @Get('summary')
  async getWarrantySummary(): Promise<WarrantySummaryDTO> {
    return this.warrantyService.getWarrantySummary();
  }

  /**
   * Create internal warranty claim
   * POST /api/v1/warranty/claims
   */
  @Post('claims')
  @HttpCode(HttpStatus.CREATED)
  async createClaim(
    @Body()
    body: {
      jobId: string;
      warrantyId?: string;
      title: string;
      description: string;
      priority: WarrantyClaimPriority;
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
    }
  ): Promise<WarrantyClaimDTO> {
    return this.warrantyService.createClaimInternal(body);
  }

  /**
   * List warranty claims with filters
   * GET /api/v1/warranty/claims
   */
  @Get('claims')
  async listClaims(
    @Query('status') status?: WarrantyClaimStatus,
    @Query('jobId') jobId?: string
  ): Promise<WarrantyClaimDTO[]> {
    return this.warrantyService.listClaims({ status, jobId });
  }

  /**
   * Get claim by ID
   * GET /api/v1/warranty/claims/:id
   */
  @Get('claims/:id')
  async getClaimById(@Param('id') id: string): Promise<WarrantyClaimDTO> {
    return this.warrantyService.getClaimById(id);
  }

  /**
   * Update claim status
   * PATCH /api/v1/warranty/claims/:id/status
   */
  @Patch('claims/:id/status')
  async updateClaimStatus(
    @Param('id') id: string,
    @Body() body: { status: WarrantyClaimStatus }
  ): Promise<WarrantyClaimDTO> {
    return this.warrantyService.updateClaimStatus(id, body.status);
  }
}
