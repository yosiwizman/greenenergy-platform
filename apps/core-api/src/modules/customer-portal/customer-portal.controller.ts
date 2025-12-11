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
import { WarrantyService } from '../warranty/warranty.service';
import { CustomerExperienceService } from '../customer-experience/customer-experience.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import { prisma } from '@greenenergy/db';
import type {
  CreatePortalSessionDto,
  PortalSessionResponse,
  ResolvePortalSessionResponse,
  PortalJobView,
  WarrantyClaimDTO,
  CustomerMessageDTO,
} from '@greenenergy/shared-types';

@Controller('api/v1/portal')
export class CustomerPortalController {
  constructor(
    private readonly portalService: CustomerPortalService,
    private readonly warrantyService: WarrantyService,
    private readonly cxService: CustomerExperienceService,
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

  /**
   * Submit warranty claim from customer portal
   * POST /api/v1/portal/jobs/:jobId/warranty-claims
   */
  @Post('jobs/:jobId/warranty-claims')
  @HttpCode(HttpStatus.CREATED)
  async createWarrantyClaim(
    @Param('jobId') jobId: string,
    @Query('token') token: string,
    @Body() body: { title: string; description: string }
  ): Promise<WarrantyClaimDTO> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    // Validate session and get session info
    const session = await prisma.portalSession.findUnique({
      where: { token },
      include: {
        customerUser: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (session.jobId !== jobId) {
      throw new UnauthorizedException('Session token is not valid for this job');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session token has expired');
    }

    // Create claim using warranty service
    return await this.warrantyService.createClaimFromPortal(
      {
        customerUserId: session.customerUserId,
        jobId: session.jobId,
      },
      body
    );
  }

  /**
   * Get messages for a job (portal session)
   * GET /api/v1/portal/jobs/:jobId/messages
   */
  @Get('jobs/:jobId/messages')
  async getJobMessages(
    @Param('jobId') jobId: string,
    @Query('token') token: string
  ): Promise<CustomerMessageDTO[]> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    // Validate session and verify it's for this job
    const session = await prisma.portalSession.findUnique({
      where: { token },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (session.jobId !== jobId) {
      throw new UnauthorizedException('Session token is not valid for this job');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session token has expired');
    }

    // Get messages using CX service
    return await this.cxService.getMessagesForJob(jobId);
  }

  /**
   * Mark messages as read for a job (portal session)
   * POST /api/v1/portal/jobs/:jobId/messages/read
   */
  @Post('jobs/:jobId/messages/read')
  @HttpCode(HttpStatus.OK)
  async markJobMessagesRead(
    @Param('jobId') jobId: string,
    @Query('token') token: string
  ): Promise<{ ok: boolean }> {
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }

    // Validate session and verify it's for this job
    const session = await prisma.portalSession.findUnique({
      where: { token },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (session.jobId !== jobId) {
      throw new UnauthorizedException('Session token is not valid for this job');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session token has expired');
    }

    // Mark messages as read
    await this.cxService.markMessagesReadForJob(jobId);
    return { ok: true };
  }
}
