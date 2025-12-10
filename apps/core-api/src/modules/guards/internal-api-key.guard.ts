import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalApiKeyGuard.name);
  private readonly internalApiKey: string;

  constructor(private configService: ConfigService) {
    this.internalApiKey =
      this.configService.get<string>('INTERNAL_API_KEY') || '';

    if (!this.internalApiKey) {
      this.logger.warn(
        'INTERNAL_API_KEY not configured! All internal API requests will be rejected.'
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-internal-api-key'];

    if (!this.internalApiKey) {
      throw new UnauthorizedException('Internal API key not configured');
    }

    if (!apiKey || apiKey !== this.internalApiKey) {
      throw new UnauthorizedException('Invalid or missing internal API key');
    }

    return true;
  }
}
