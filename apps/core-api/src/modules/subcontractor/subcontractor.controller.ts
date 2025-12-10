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
  UseGuards,
} from '@nestjs/common';
import { SubcontractorService } from './subcontractor.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  SubcontractorDTO,
  CreateSubcontractorDto,
  UpdateSubcontractorDto,
  SubcontractorComplianceStatus,
  SubcontractorPerformanceSummary,
  SubcontractorPerformanceStatus,
  JobSubcontractorAssignmentDTO,
  AssignSubcontractorDto,
} from '@greenenergy/shared-types';

@Controller('api/v1/subcontractors')
export class SubcontractorController {
  constructor(private readonly subcontractorService: SubcontractorService) {}

  /**
   * List all subcontractors with optional filters
   */
  @Get()
  async listSubcontractors(
    @Query('isActive') isActive?: string,
    @Query('isCompliant') isCompliant?: string,
    @Query('performanceStatus') performanceStatus?: SubcontractorPerformanceStatus
  ): Promise<SubcontractorDTO[]> {
    const filters: any = {};

    if (isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    if (isCompliant !== undefined) {
      filters.isCompliant = isCompliant === 'true';
    }

    if (performanceStatus) {
      filters.performanceStatus = performanceStatus;
    }

    return this.subcontractorService.listSubcontractors(filters);
  }

  /**
   * Get a single subcontractor by ID
   */
  @Get(':id')
  async getSubcontractor(@Param('id') id: string): Promise<SubcontractorDTO> {
    return this.subcontractorService.getSubcontractorById(id);
  }

  /**
   * Create a new subcontractor
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubcontractor(@Body() input: CreateSubcontractorDto): Promise<SubcontractorDTO> {
    return this.subcontractorService.createSubcontractor(input);
  }

  /**
   * Update a subcontractor
   */
  @Patch(':id')
  async updateSubcontractor(
    @Param('id') id: string,
    @Body() input: UpdateSubcontractorDto
  ): Promise<SubcontractorDTO> {
    return this.subcontractorService.updateSubcontractor(id, input);
  }

  /**
   * Deactivate a subcontractor
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateSubcontractor(@Param('id') id: string): Promise<void> {
    await this.subcontractorService.deactivateSubcontractor(id);
  }

  /**
   * Get compliance status for a subcontractor
   */
  @Get(':id/compliance')
  async getCompliance(@Param('id') id: string): Promise<SubcontractorComplianceStatus> {
    return this.subcontractorService.evaluateCompliance(id);
  }

  /**
   * Evaluate compliance for all subcontractors
   */
  @Post('compliance/evaluate-all')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async evaluateAllCompliance(): Promise<{ total: number; nonCompliant: number }> {
    return this.subcontractorService.evaluateComplianceForAll();
  }

  /**
   * Evaluate performance for a subcontractor
   */
  @Post(':id/performance/evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluatePerformance(@Param('id') id: string): Promise<SubcontractorPerformanceSummary> {
    return this.subcontractorService.evaluateSubcontractorPerformance(id);
  }

  /**
   * Get latest performance summary for a subcontractor
   */
  @Get(':id/performance')
  async getPerformance(@Param('id') id: string): Promise<SubcontractorPerformanceSummary> {
    // Re-evaluate and return
    return this.subcontractorService.evaluateSubcontractorPerformance(id);
  }

  /**
   * Evaluate performance for all subcontractors
   */
  @Post('performance/evaluate-all')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async evaluateAllPerformance(): Promise<{ total: number; evaluated: number }> {
    return this.subcontractorService.evaluateAllSubcontractorsPerformance();
  }
}

@Controller('api/v1/jobs')
export class JobSubcontractorController {
  constructor(private readonly subcontractorService: SubcontractorService) {}

  /**
   * List subcontractors assigned to a job
   */
  @Get(':jobId/subcontractors')
  async listJobSubcontractors(
    @Param('jobId') jobId: string
  ): Promise<JobSubcontractorAssignmentDTO[]> {
    return this.subcontractorService.listJobSubcontractors(jobId);
  }

  /**
   * Assign subcontractor to job
   */
  @Post(':jobId/subcontractors')
  @HttpCode(HttpStatus.CREATED)
  async assignSubcontractor(
    @Param('jobId') jobId: string,
    @Body() input: AssignSubcontractorDto
  ): Promise<JobSubcontractorAssignmentDTO> {
    return this.subcontractorService.assignSubcontractorToJob(jobId, input);
  }

  /**
   * Unassign subcontractor from job
   */
  @Post('subcontractor-assignments/:assignmentId/unassign')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignSubcontractor(@Param('assignmentId') assignmentId: string): Promise<void> {
    await this.subcontractorService.unassignSubcontractorFromJob(assignmentId);
  }
}
