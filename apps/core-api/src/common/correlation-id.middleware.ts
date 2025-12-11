import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

/**
 * Middleware that attaches a correlation ID to each HTTP request.
 * Reads x-request-id from the incoming request header or generates a new one.
 * Attaches it to the request object and response header for end-to-end tracing.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Read x-request-id from header or generate a new unique ID
    const correlationId =
      (req.headers['x-request-id'] as string) || this.generateCorrelationId();

    // Attach to request object for use in interceptors and services
    (req as any).correlationId = correlationId;

    // Echo back in response header for client-side tracing
    res.setHeader('x-request-id', correlationId);

    next();
  }

  private generateCorrelationId(): string {
    // Generate a simple unique ID: timestamp + random bytes
    const timestamp = Date.now().toString(36);
    const random = randomBytes(6).toString('hex');
    return `${timestamp}-${random}`;
  }
}
