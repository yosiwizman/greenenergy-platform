import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { LlmUsageService } from './llm-usage.service';
import type { LlmUsageListItemDTO, LlmUsageSummaryDTO } from '@greenenergy/shared-types';

@Controller('llm-usage')
@UseGuards(InternalApiKeyGuard)
export class LlmUsageController {
  constructor(private readonly llmUsageService: LlmUsageService) {}

  /**
   * GET /api/v1/llm-usage/summary?days=
   */
  @Get('summary')
  async getSummary(@Query('days') days?: string): Promise<LlmUsageSummaryDTO> {
    const parsedDays = days ? Number(days) : 7;
    return this.llmUsageService.getSummary(parsedDays);
  }

  /**
   * GET /api/v1/llm-usage/recent?limit=
   */
  @Get('recent')
  async getRecent(@Query('limit') limit?: string): Promise<LlmUsageListItemDTO[]> {
    const parsedLimit = limit ? Number(limit) : 50;
    return this.llmUsageService.getRecent(parsedLimit);
  }
}
