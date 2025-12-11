import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpsStatusService } from '../ops-status.service';
import { MetricsService } from '../../metrics/metrics.service';

// Mock prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ health_check: 1 }]),
    quickBooksAuth: {
      findFirst: jest.fn().mockResolvedValue({
        id: '1',
        isActive: true,
      }),
    },
  },
}));

describe('OpsStatusService', () => {
  let service: OpsStatusService;
  let configService: ConfigService;
  let metricsService: MetricsService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JOBNIMBUS_API_KEY: 'test-key',
        JOBNIMBUS_API_URL: 'https://api.jobnimbus.com',
        QUICKBOOKS_CLIENT_ID: 'test-client-id',
        QUICKBOOKS_CLIENT_SECRET: 'test-secret',
        SMTP_HOST: 'smtp.test.com',
        SMTP_USER: 'user@test.com',
        SMTP_PASS: 'password',
        TWILIO_ACCOUNT_SID: 'test-sid',
        TWILIO_AUTH_TOKEN: 'test-token',
        TWILIO_PHONE_NUMBER: '+1234567890',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockMetricsService = {
    getMetrics: jest.fn().mockResolvedValue(`
# HELP cron_jobs_last_run_timestamp Unix timestamp of the last successful cron job run
# TYPE cron_jobs_last_run_timestamp gauge
cron_jobs_last_run_timestamp{job_name="workflow_engine"} 1638360000.123
cron_jobs_last_run_timestamp{job_name="quickbooks_sync"} 1638350000.456
    `),
    observeHttpRequest: jest.fn(),
    setCronLastRunTimestamp: jest.fn(),
    setExternalServiceStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpsStatusService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<OpsStatusService>(OpsStatusService);
    configService = module.get<ConfigService>(ConfigService);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return ops status', async () => {
    const status = await service.getOpsStatus();

    expect(status).toBeDefined();
    expect(status.generatedAt).toBeDefined();
    expect(status.coreApiHealthy).toBe(true);
    expect(status.databaseHealthy).toBe(true);
    expect(status.externalServices).toBeInstanceOf(Array);
    expect(status.latestCronRuns).toBeInstanceOf(Array);
  });

  it('should check all external services', async () => {
    const status = await service.getOpsStatus();

    const serviceNames = status.externalServices.map((s) => s.name);
    expect(serviceNames).toContain('jobnimbus');
    expect(serviceNames).toContain('quickbooks');
    expect(serviceNames).toContain('email');
    expect(serviceNames).toContain('sms');
  });

  it('should report services as UP when configured', async () => {
    const status = await service.getOpsStatus();

    const jobnimbusService = status.externalServices.find((s) => s.name === 'jobnimbus');
    expect(jobnimbusService?.status).toBe('UP');

    const qbService = status.externalServices.find((s) => s.name === 'quickbooks');
    expect(qbService?.status).toBe('UP');
  });

  it('should parse cron job metrics correctly', async () => {
    const status = await service.getOpsStatus();

    expect(status.latestCronRuns).toHaveLength(2);
    
    const workflowJob = status.latestCronRuns.find((j) => j.name === 'workflow_engine');
    expect(workflowJob).toBeDefined();
    expect(workflowJob?.lastRunAt).toBeDefined();

    const qbJob = status.latestCronRuns.find((j) => j.name === 'quickbooks_sync');
    expect(qbJob).toBeDefined();
    expect(qbJob?.lastRunAt).toBeDefined();
  });

  it('should handle missing config gracefully', async () => {
    mockConfigService.get.mockReturnValue(undefined);

    const status = await service.getOpsStatus();

    // Services without config should be DOWN
    const jobnimbusService = status.externalServices.find((s) => s.name === 'jobnimbus');
    expect(jobnimbusService?.status).toBe('DOWN');
    expect(jobnimbusService?.details).toContain('Configuration missing');
  });

  it('should handle database errors', async () => {
    const { prisma } = await import('@greenenergy/db');
    (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

    const status = await service.getOpsStatus();
    expect(status.databaseHealthy).toBe(false);
  });
});
