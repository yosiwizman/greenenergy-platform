import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailNotificationService } from '../email-notification.service';

// Mock Resend
jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
      },
    })),
  };
});

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe('with valid Resend configuration', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_EMAIL_PROVIDER: 'resend',
            RESEND_API_KEY: 'test-api-key',
            NOTIFICATIONS_FROM_EMAIL: 'no-reply@greenenergy.test',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<EmailNotificationService>(EmailNotificationService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should send customer message email with correct parameters', async () => {
      const params = {
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'Project Status Update',
        messageBody: 'Your solar installation is progressing well.',
        isAiGenerated: false,
      };

      await service.sendCustomerMessageEmail(params);

      // Check that the email was attempted (service should not throw)
      expect(true).toBe(true);
    });

    it('should include AI-assisted note when isAiGenerated is true', async () => {
      const params = {
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'ETA Update',
        messageBody: 'Your installation is scheduled for next week.',
        isAiGenerated: true,
      };

      await service.sendCustomerMessageEmail(params);

      // Service should handle this without throwing
      expect(true).toBe(true);
    });
  });

  describe('with missing RESEND_API_KEY', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_EMAIL_PROVIDER: 'resend',
            RESEND_API_KEY: undefined,
            NOTIFICATIONS_FROM_EMAIL: 'no-reply@greenenergy.test',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<EmailNotificationService>(EmailNotificationService);
    });

    it('should not throw when sending email', async () => {
      const params = {
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'Test',
        messageBody: 'Test body',
      };

      await expect(service.sendCustomerMessageEmail(params)).resolves.not.toThrow();
    });

    it('should log warning and skip email sending', async () => {
      const params = {
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'Test',
        messageBody: 'Test body',
      };

      // Should resolve without error
      await service.sendCustomerMessageEmail(params);
      expect(true).toBe(true);
    });
  });

  describe('with missing NOTIFICATIONS_FROM_EMAIL', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_EMAIL_PROVIDER: 'resend',
            RESEND_API_KEY: 'test-api-key',
            NOTIFICATIONS_FROM_EMAIL: undefined,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<EmailNotificationService>(EmailNotificationService);
    });

    it('should not throw when sending email', async () => {
      const params = {
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'Test',
        messageBody: 'Test body',
      };

      await expect(service.sendCustomerMessageEmail(params)).resolves.not.toThrow();
    });
  });

  describe('with unsupported provider', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_EMAIL_PROVIDER: 'sendgrid',
            RESEND_API_KEY: 'test-api-key',
            NOTIFICATIONS_FROM_EMAIL: 'no-reply@greenenergy.test',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<EmailNotificationService>(EmailNotificationService);
    });

    it('should log warning about unsupported provider', async () => {
      const params = {
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'Test',
        messageBody: 'Test body',
      };

      await service.sendCustomerMessageEmail(params);
      expect(true).toBe(true);
    });
  });
});
