import { Controller, Get, Post, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiOperationsService } from './ai-operations.service';
import type {
  AiJobSummaryDTO,
  AiJobRecommendationDTO,
  AiCustomerMessageDTO,
  AiCustomerMessageRequestDTO,
  AiOpsLlmJobSummaryDTO,
  AiOpsLlmCustomerMessageInputDTO,
  AiOpsLlmCustomerMessageDTO,
} from '@greenenergy/shared-types';

@Controller('api/v1/ai-ops')
export class AiOpsController {
  constructor(private readonly aiOpsService: AiOperationsService) {}

  /**
   * GET /api/v1/ai-ops/jobs/:jobId/summary
   * Get AI-generated job summary with sections
   */
  @Get('jobs/:jobId/summary')
  async getJobSummary(@Param('jobId') jobId: string): Promise<AiJobSummaryDTO> {
    return this.aiOpsService.getJobSummary(jobId);
  }

  /**
   * GET /api/v1/ai-ops/jobs/:jobId/recommendations
   * Get AI-generated recommendations for a job
   */
  @Get('jobs/:jobId/recommendations')
  async getJobRecommendations(@Param('jobId') jobId: string): Promise<AiJobRecommendationDTO[]> {
    return this.aiOpsService.getJobRecommendations(jobId);
  }

  /**
   * GET /api/v1/ai-ops/jobs/:jobId/insights
   * Get both summary and recommendations in one call
   */
  @Get('jobs/:jobId/insights')
  async getJobInsights(@Param('jobId') jobId: string): Promise<{
    summary: AiJobSummaryDTO;
    recommendations: AiJobRecommendationDTO[];
  }> {
    return this.aiOpsService.getJobInsights(jobId);
  }

  /**
   * POST /api/v1/ai-ops/jobs/:jobId/customer-message
   * Generate customer-facing message based on job data
   */
  @Post('jobs/:jobId/customer-message')
  @HttpCode(HttpStatus.OK)
  async generateCustomerMessage(
    @Param('jobId') jobId: string,
    @Body() input: AiCustomerMessageRequestDTO
  ): Promise<AiCustomerMessageDTO> {
    return this.aiOpsService.generateCustomerMessage(jobId, input);
  }

  /**
   * POST /api/v1/ai-ops/jobs/:jobId/summary/llm
   * Generate LLM-powered job summary (Phase 10 Sprint 1)
   * Falls back to rule-based summary if LLM is disabled or unavailable
   */
  @Post('jobs/:jobId/summary/llm')
  @HttpCode(HttpStatus.OK)
  async getLlmJobSummary(@Param('jobId') jobId: string): Promise<AiOpsLlmJobSummaryDTO> {
    return this.aiOpsService.generateJobSummaryWithLlm(jobId);
  }

  /**
   * POST /api/v1/ai-ops/jobs/:jobId/customer-message/llm
   * Generate LLM-powered customer message draft (Phase 10 Sprint 1)
   * Falls back to template-based message if LLM is disabled or unavailable
   */
  @Post('jobs/:jobId/customer-message/llm')
  @HttpCode(HttpStatus.OK)
  async getLlmCustomerMessage(
    @Param('jobId') jobId: string,
    @Body() body: { tone?: 'friendly' | 'formal' | 'direct'; context?: string }
  ): Promise<AiOpsLlmCustomerMessageDTO> {
    return this.aiOpsService.generateCustomerMessageWithLlm({
      jobId,
      tone: body?.tone,
      context: (body?.context as any) ?? 'general_update',
    });
  }
}
