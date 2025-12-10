import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import * as jwt from 'jsonwebtoken';
import type {
  EmbeddedPanelType,
  EmbedSessionPayload,
  EmbedLinkResponse,
} from '@greenenergy/shared-types';

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);
  private readonly signingSecret: string;
  private readonly tokenTTLMinutes: number;
  private readonly dashboardBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.signingSecret =
      this.configService.get<string>('EMBED_SIGNING_SECRET') ||
      'default-secret-change-in-production';

    this.tokenTTLMinutes = this.configService.get<number>('EMBED_TOKEN_TTL_MINUTES') || 30;

    this.dashboardBaseUrl =
      this.configService.get<string>('INTERNAL_DASHBOARD_BASE_URL') || 'http://localhost:3002';

    if (this.signingSecret === 'default-secret-change-in-production') {
      this.logger.warn(
        'EMBED_SIGNING_SECRET not configured! Using default (INSECURE for production)'
      );
    }
  }

  /**
   * Generate a signed embed token
   */
  generateToken(jobId: string, panelType: EmbeddedPanelType, ttlMinutes?: number): string {
    const ttl = ttlMinutes || this.tokenTTLMinutes;
    const exp = Math.floor(Date.now() / 1000) + ttl * 60; // Convert minutes to seconds

    const payload: EmbedSessionPayload = {
      jobId,
      panelType,
      exp,
    };

    const token = jwt.sign(payload, this.signingSecret, {
      algorithm: 'HS256',
    });

    return token;
  }

  /**
   * Verify and decode an embed token
   */
  verifyToken(token: string): EmbedSessionPayload {
    try {
      const decoded = jwt.verify(token, this.signingSecret, {
        algorithms: ['HS256'],
      }) as EmbedSessionPayload;

      // Additional expiry check (jwt.verify already checks exp, but being explicit)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new UnauthorizedException('Embed token has expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(`Invalid embed token: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate an embed link for a job and panel type
   */
  async generateEmbedLink(jobId: string, panelType: EmbeddedPanelType): Promise<EmbedLinkResponse> {
    // Verify job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException(`Job not found: ${jobId}`);
    }

    // Generate token
    const token = this.generateToken(jobId, panelType);

    // Construct URL based on panel type
    let path: string;
    switch (panelType) {
      case 'QC_PANEL':
        path = '/embed/qc';
        break;
      case 'RISK_VIEW':
        path = '/embed/risk';
        break;
      case 'CUSTOMER_PORTAL_VIEW':
        path = '/embed/portal';
        break;
      default:
        throw new Error(`Unknown panel type: ${panelType}`);
    }

    const url = `${this.dashboardBaseUrl}${path}?token=${encodeURIComponent(token)}`;

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + this.tokenTTLMinutes * 60 * 1000);

    return {
      url,
      panelType,
      jobId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Resolve an embed session from a token
   */
  async resolveEmbedSession(token: string): Promise<EmbedSessionPayload> {
    const payload = this.verifyToken(token);

    // Optionally verify job still exists
    const job = await prisma.job.findUnique({
      where: { id: payload.jobId },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException(`Job not found: ${payload.jobId}`);
    }

    return payload;
  }
}
