import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerPortalService } from './customer-portal.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type {
  CreatePortalSessionDto,
  PortalSessionResponse,
  ResolvePortalSessionResponse,
  PortalJobView,
} from '@greenenergy/shared-types';

@Controller('api/v1/portal')
export class CustomerPortalController {
  constructor(
    private readonly portalService: CustomerPortalService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Create a magic link for a customer to access their job portal
   * Protected with internal API key
   */
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async createMagicLink(
    @Body() dto: CreatePortalSessionDto,
    @Headers('x-internal-api-key') apiKey?: string
  ): Promise<PortalSessionResponse> {
    // Optional internal API key protection
    const internalApiKey = this.configService.get<string>('INTERNAL_API_KEY');
    if (internalApiKey && apiKey !== internalApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const result = await this.portalService.createPortalSessionForJob(dto.jobId, dto.email);
    return result;
  }

  /**
   * Resolve a portal session token and return job information
   * Used by the magic-link authentication page
   */
  @Get('session/resolve')
  async resolveSession(@Query('token') token: string): Promise<ResolvePortalSessionResponse> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    return await this.portalService.resolvePortalSession(token);
  }

  /**
   * Get job view for an authenticated portal session
   */
  @Get('jobs/:jobId')
  async getJobView(
    @Param('jobId') jobId: string,
    @Query('token') token: string
  ): Promise<PortalJobView> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    return await this.portalService.getPortalJobViewForSession(jobId, token);
  }

  /**
   * Get portal preview for internal use (embedded panels)
   * Protected with internal API key
   */
  @Get('internal/jobs/:jobId')
  @UseGuards(InternalApiKeyGuard)
  async getInternalJobView(@Param('jobId') jobId: string): Promise<PortalJobView> {
    return await this.portalService.buildInternalPortalJobView(jobId);
  }
}
