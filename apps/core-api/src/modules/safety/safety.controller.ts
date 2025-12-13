import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { SafetyService } from './safety.service';
import type {
  SafetyIncidentDTO,
  CreateSafetyIncidentDto,
  UpdateSafetyIncidentStatusDto,
  SafetyChecklistDTO,
  CreateSafetyChecklistDto,
  SafetyIncidentSummaryDTO,
  OshalogSummaryDTO,
  SafetyIncidentSeverity,
  SafetyIncidentStatus,
  SafetyChecklistType,
} from '@greenenergy/shared-types';

@Controller('safety')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  // ==================== INCIDENTS ====================

  /**
   * POST /api/v1/safety/incidents
   * Create a new safety incident
   */
  @Post('incidents')
  async createIncident(@Body() body: CreateSafetyIncidentDto): Promise<SafetyIncidentDTO> {
    return this.safetyService.createIncident(body);
  }

  /**
   * GET /api/v1/safety/incidents
   * List incidents with optional filters
   */
  @Get('incidents')
  async listIncidents(
    @Query('jobId') jobId?: string,
    @Query('subcontractorId') subcontractorId?: string,
    @Query('severity') severity?: SafetyIncidentSeverity,
    @Query('status') status?: SafetyIncidentStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ): Promise<SafetyIncidentDTO[]> {
    return this.safetyService.listIncidents({
      jobId,
      subcontractorId,
      severity,
      status,
      fromDate,
      toDate,
    });
  }

  /**
   * GET /api/v1/safety/incidents/:id
   * Get a single incident
   */
  @Get('incidents/:id')
  async getIncident(@Param('id') id: string): Promise<SafetyIncidentDTO> {
    return this.safetyService.getIncidentById(id);
  }

  /**
   * PATCH /api/v1/safety/incidents/:id/status
   * Update incident status
   */
  @Patch('incidents/:id/status')
  async updateIncidentStatus(
    @Param('id') id: string,
    @Body() body: UpdateSafetyIncidentStatusDto
  ): Promise<SafetyIncidentDTO> {
    return this.safetyService.updateIncidentStatus(id, body.status);
  }

  /**
   * GET /api/v1/safety/incidents/summary
   * Get incident summary statistics
   */
  @Get('incidents-summary')
  async getIncidentSummary(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ): Promise<SafetyIncidentSummaryDTO> {
    return this.safetyService.getIncidentSummary({ fromDate, toDate });
  }

  /**
   * GET /api/v1/safety/osha-summary
   * Get OSHA summary for a year
   */
  @Get('osha-summary')
  async getOshaSummary(@Query('year', ParseIntPipe) year: number): Promise<OshalogSummaryDTO> {
    return this.safetyService.getOshaSummary(year);
  }

  // ==================== CHECKLISTS ====================

  /**
   * POST /api/v1/safety/checklists
   * Create a new safety checklist
   */
  @Post('checklists')
  async createChecklist(@Body() body: CreateSafetyChecklistDto): Promise<SafetyChecklistDTO> {
    return this.safetyService.createChecklist(body);
  }

  /**
   * GET /api/v1/safety/checklists
   * List checklists with optional filters
   */
  @Get('checklists')
  async listChecklists(
    @Query('jobId') jobId?: string,
    @Query('subcontractorId') subcontractorId?: string,
    @Query('type') type?: SafetyChecklistType,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ): Promise<SafetyChecklistDTO[]> {
    return this.safetyService.listChecklists({
      jobId,
      subcontractorId,
      type,
      fromDate,
      toDate,
    });
  }
}
