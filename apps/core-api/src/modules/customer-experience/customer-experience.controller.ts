import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CustomerExperienceService } from './customer-experience.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  CustomerMessageDTO,
  CreateCustomerMessageInput,
  CustomerMessageType,
} from '@greenenergy/shared-types';

@Controller('api/v1/cx')
@UseGuards(InternalApiKeyGuard)
export class CustomerExperienceController {
  constructor(private readonly cxService: CustomerExperienceService) {}

  /**
   * Get all messages for a job
   * GET /api/v1/cx/jobs/:jobId/messages
   */
  @Get('jobs/:jobId/messages')
  async getMessages(@Param('jobId') jobId: string): Promise<CustomerMessageDTO[]> {
    return this.cxService.getMessagesForJob(jobId);
  }

  /**
   * Create a new message for a job
   * POST /api/v1/cx/jobs/:jobId/messages
   */
  @Post('jobs/:jobId/messages')
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @Param('jobId') jobId: string,
    @Body() body: CreateCustomerMessageInput
  ): Promise<CustomerMessageDTO> {
    return this.cxService.createMessageForJob(jobId, body);
  }

  /**
   * Create an AI-generated message for a job
   * POST /api/v1/cx/jobs/:jobId/messages/ai
   */
  @Post('jobs/:jobId/messages/ai')
  @HttpCode(HttpStatus.CREATED)
  async createAiMessage(
    @Param('jobId') jobId: string,
    @Body()
    body: {
      messageType: CustomerMessageType;
      tone?: 'FRIENDLY' | 'FORMAL';
      customPrompt?: string;
    }
  ): Promise<CustomerMessageDTO> {
    return this.cxService.createAutoMessageFromAi(jobId, body);
  }

  /**
   * Mark all messages for a job as read
   * POST /api/v1/cx/jobs/:jobId/read
   */
  @Post('jobs/:jobId/read')
  @HttpCode(HttpStatus.OK)
  async markMessagesRead(@Param('jobId') jobId: string): Promise<{ ok: boolean }> {
    await this.cxService.markMessagesReadForJob(jobId);
    return { ok: true };
  }
}
