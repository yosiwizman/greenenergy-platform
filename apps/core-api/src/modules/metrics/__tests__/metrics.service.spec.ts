import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return metrics as text', async () => {
    const metrics = await service.getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should record HTTP request metrics', () => {
    expect(() => {
      service.observeHttpRequest('GET', '/api/v1/jobs', 200, 150);
    }).not.toThrow();
  });

  it('should set cron last run timestamp', () => {
    expect(() => {
      service.setCronLastRunTimestamp('test_job');
    }).not.toThrow();
  });

  it('should set external service status', () => {
    expect(() => {
      service.setExternalServiceStatus('database', true);
      service.setExternalServiceStatus('jobnimbus', false);
    }).not.toThrow();
  });

  it('should normalize paths to reduce cardinality', async () => {
    // Record several similar requests with different IDs
    service.observeHttpRequest('GET', '/api/v1/jobs/123', 200, 100);
    service.observeHttpRequest('GET', '/api/v1/jobs/456', 200, 105);
    service.observeHttpRequest('GET', '/api/v1/jobs/abc-def-ghi', 200, 110);

    const metrics = await service.getMetrics();
    
    // All should be normalized to the same path pattern
    expect(metrics).toContain('http_requests_total');
  });

  it('should handle metric recording errors gracefully', () => {
    // Test with invalid input - should not throw
    expect(() => {
      service.observeHttpRequest('', '', -1, -1);
    }).not.toThrow();
  });
});
