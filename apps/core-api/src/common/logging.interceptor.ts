import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../modules/metrics/metrics.service';

/**
 * Interceptor that logs structured HTTP request information with correlation IDs.
 * Also records HTTP metrics for Prometheus monitoring.
 * Captures method, path, status code, duration, and business context.
 * Avoids logging full request/response bodies to reduce PII risk.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    @Optional() @Inject(MetricsService) private metricsService?: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, path, url } = request;
    const correlationId = (request as any).correlationId || 'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';
    const ip = request.ip || request.socket.remoteAddress || 'unknown';

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Extract business context if available (e.g., jobId from route params)
        const jobId = (request.params as any)?.jobId || undefined;

        // Record metrics if MetricsService is available
        if (this.metricsService) {
          this.metricsService.observeHttpRequest(method, path || url, statusCode, duration);
        }

        this.logger.log({
          type: 'http_request',
          method,
          path: path || url,
          statusCode,
          durationMs: duration,
          correlationId,
          userAgent,
          ip,
          ...(jobId && { jobId }),
        });
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        this.logger.error({
          type: 'http_request_error',
          method,
          path: path || url,
          statusCode,
          durationMs: duration,
          correlationId,
          userAgent,
          ip,
          errorMessage: error.message,
          errorStack: error.stack,
        });

        return throwError(() => error);
      }),
    );
  }
}
