import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { EmbedService } from './embed.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  EmbeddedPanelType,
  EmbedLinkResponse,
  EmbedSessionPayload,
} from '@greenenergy/shared-types';

interface GenerateEmbedLinkDto {
  jobId: string;
  panelType: EmbeddedPanelType;
}

@Controller('embed')
export class EmbedController {
  private readonly logger = new Logger(EmbedController.name);

  constructor(private readonly embedService: EmbedService) {}

  /**
   * POST /embed/links
   * Generate an embed link for a job panel (protected by internal API key)
   */
  @Post('links')
  @UseGuards(InternalApiKeyGuard)
  async generateEmbedLink(@Body() dto: GenerateEmbedLinkDto): Promise<EmbedLinkResponse> {
    this.logger.log(`Generating embed link for job ${dto.jobId}, panel ${dto.panelType}`);

    try {
      const result = await this.embedService.generateEmbedLink(dto.jobId, dto.panelType);
      return result;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to generate embed link: ${err.message}`, err.stack);

      if (err.message.includes('not found')) {
        throw new HttpException(err.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Failed to generate embed link: ${err.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /embed/session/resolve
   * Resolve an embed token to get session payload
   */
  @Get('session/resolve')
  async resolveSession(@Query('token') token: string): Promise<{ payload: EmbedSessionPayload }> {
    if (!token) {
      throw new HttpException('Token query parameter is required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log('Resolving embed session token');

    try {
      const payload = await this.embedService.resolveEmbedSession(token);
      return { payload };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to resolve embed session: ${err.message}`, err.stack);

      if (err instanceof HttpException) {
        throw err;
      }

      throw new HttpException(
        `Failed to resolve embed session: ${err.message}`,
        HttpStatus.UNAUTHORIZED
      );
    }
  }
}
