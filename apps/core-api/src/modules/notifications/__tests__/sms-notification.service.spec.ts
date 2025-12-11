import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsNotificationService } from '../sms-notification.service';

// Mock Twilio
const mockTwilioMessageCreate = jest.fn().mockResolvedValue({ sid: 'test-sms-sid' });
jest.mock('twilio', () => {
  return {
    Twilio: jest.fn().mockImplementation(() => ({
      messages: {
        create: mockTwilioMessageCreate,
      },
    })),
  };
});

describe('SmsNotificationService', () => {
  let service: SmsNotificationService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTwilioMessageCreate.mockClear();
  });

  describe('with valid Twilio configuration', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_SMS_PROVIDER: 'twilio',
            TWILIO_ACCOUNT_SID: 'test-account-sid',
            TWILIO_AUTH_TOKEN: 'test-auth-token',
            TWILIO_FROM_NUMBER: '+15555555555',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<SmsNotificationService>(SmsNotificationService);
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should send SMS with correct parameters', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Payment reminder: You have an outstanding balance. Please contact us.',
        jobId: 'job-123',
        contextLabel: 'PAYMENT_REMINDER',
      };

      await service.sendCustomerSms(params);

      expect(mockTwilioMessageCreate).toHaveBeenCalledWith({
        to: '+15551234567',
        from: '+15555555555',
        body: 'Payment reminder: You have an outstanding balance. Please contact us.',
      });
    });

    it('should send SMS without optional jobId and contextLabel', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
      };

      await service.sendCustomerSms(params);

      expect(mockTwilioMessageCreate).toHaveBeenCalledWith({
        to: '+15551234567',
        from: '+15555555555',
        body: 'Test message',
      });
    });

    it('should not throw if Twilio API fails', async () => {
      mockTwilioMessageCreate.mockRejectedValueOnce(new Error('Twilio API error'));

      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
        jobId: 'job-123',
      };

      await expect(service.sendCustomerSms(params)).resolves.not.toThrow();
    });
  });

  describe('with missing TWILIO_ACCOUNT_SID', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_SMS_PROVIDER: 'twilio',
            TWILIO_ACCOUNT_SID: undefined,
            TWILIO_AUTH_TOKEN: 'test-auth-token',
            TWILIO_FROM_NUMBER: '+15555555555',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<SmsNotificationService>(SmsNotificationService);
    });

    it('should not throw when sending SMS', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
        jobId: 'job-123',
      };

      await expect(service.sendCustomerSms(params)).resolves.not.toThrow();
    });

    it('should not call Twilio API', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
        jobId: 'job-123',
      };

      await service.sendCustomerSms(params);

      expect(mockTwilioMessageCreate).not.toHaveBeenCalled();
    });
  });

  describe('with missing TWILIO_AUTH_TOKEN', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_SMS_PROVIDER: 'twilio',
            TWILIO_ACCOUNT_SID: 'test-account-sid',
            TWILIO_AUTH_TOKEN: undefined,
            TWILIO_FROM_NUMBER: '+15555555555',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<SmsNotificationService>(SmsNotificationService);
    });

    it('should not throw when sending SMS', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
        jobId: 'job-123',
      };

      await expect(service.sendCustomerSms(params)).resolves.not.toThrow();
    });
  });

  describe('with missing TWILIO_FROM_NUMBER', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_SMS_PROVIDER: 'twilio',
            TWILIO_ACCOUNT_SID: 'test-account-sid',
            TWILIO_AUTH_TOKEN: 'test-auth-token',
            TWILIO_FROM_NUMBER: undefined,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<SmsNotificationService>(SmsNotificationService);
    });

    it('should not throw when sending SMS', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
        jobId: 'job-123',
      };

      await expect(service.sendCustomerSms(params)).resolves.not.toThrow();
    });
  });

  describe('with unsupported provider', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config: Record<string, any> = {
            NOTIFICATIONS_SMS_PROVIDER: 'nexmo',
            TWILIO_ACCOUNT_SID: 'test-account-sid',
            TWILIO_AUTH_TOKEN: 'test-auth-token',
            TWILIO_FROM_NUMBER: '+15555555555',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsNotificationService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<SmsNotificationService>(SmsNotificationService);
    });

    it('should not throw when sending SMS', async () => {
      const params = {
        toPhone: '+15551234567',
        body: 'Test message',
        jobId: 'job-123',
      };

      await service.sendCustomerSms(params);
      expect(true).toBe(true);
    });
  });
});
