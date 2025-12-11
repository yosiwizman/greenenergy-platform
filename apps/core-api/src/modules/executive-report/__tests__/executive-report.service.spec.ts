import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutiveReportService } from '../executive-report.service';
import { FinanceService } from '../../finance/finance.service';
import { ForecastService } from '../../forecast/forecast.service';
import { CommandCenterService } from '../../command-center/command-center.service';
import { EmailNotificationService } from '../../notifications/email-notification.service';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    workflowActionLog: {
      count: jest.fn(),
    },
  },
}));

const { prisma } = require('@greenenergy/db');

describe('ExecutiveReportService', () => {
  let service: ExecutiveReportService;
  let financeService: jest.Mocked<FinanceService>;
  let forecastService: jest.Mocked<ForecastService>;
  let commandCenterService: jest.Mocked<CommandCenterService>;
  let emailNotificationService: jest.Mocked<EmailNotificationService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutiveReportService,
        {
          provide: FinanceService,
          useValue: {
            getArSummary: jest.fn(),
            getArAgingSummary: jest.fn(),
          },
        },
        {
          provide: ForecastService,
          useValue: {
            getForecastOverview: jest.fn(),
          },
        },
        {
          provide: CommandCenterService,
          useValue: {
            getOverview: jest.fn(),
          },
        },
        {
          provide: EmailNotificationService,
          useValue: {
            sendExecutiveDigestEmail: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutiveReportService>(ExecutiveReportService);
    financeService = module.get(FinanceService) as jest.Mocked<FinanceService>;
    forecastService = module.get(ForecastService) as jest.Mocked<ForecastService>;
    commandCenterService = module.get(CommandCenterService) as jest.Mocked<CommandCenterService>;
    emailNotificationService = module.get(EmailNotificationService) as jest.Mocked<EmailNotificationService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildWeeklyDigest', () => {
    it('should build a complete weekly digest with all required fields', async () => {
      // Mock data
      const mockArSummary = {
        totalOutstanding: 50000,
        totalPaid: 150000,
        totalContractValue: 200000,
        jobsPaid: 10,
        jobsPartiallyPaid: 5,
        jobsUnpaid: 3,
        jobsOverdue: 2,
      };

      const mockAgingSummary = {
        generatedAt: new Date().toISOString(),
        totalOutstanding: 50000,
        buckets: [
          { bucket: 'CURRENT', outstanding: 20000, jobsCount: 5 },
          { bucket: 'DAYS_1_30', outstanding: 15000, jobsCount: 3 },
          { bucket: 'DAYS_31_60', outstanding: 10000, jobsCount: 2 },
          { bucket: 'DAYS_61_90', outstanding: 5000, jobsCount: 1 },
        ],
      };

      const mockForecastOverview = {
        generatedAt: new Date().toISOString(),
        cashflow: {
          generatedAt: new Date().toISOString(),
          horizonWeeks: 12,
          points: [],
        },
        pipeline: {
          generatedAt: new Date().toISOString(),
          totalPipelineAmount: 500000,
          totalWeightedAmount: 350000,
          buckets: [],
        },
      };

      const mockCommandCenterOverview = {
        summary: {
          jobsInProgress: 20,
          jobsHighRisk: 5,
          jobsAtRiskSchedule: 3,
          openSafetyIncidents: 2,
          subsGreen: 10,
          subsYellow: 3,
          subsRed: 1,
          warrantiesExpiringSoon: 4,
          materialOrdersDelayed: 2,
          lowMarginHighRiskJobs: 1,
          workflowActionsLast24h: 15,
        },
        roleViews: {} as any,
        jobsNeedingAttention: [],
      };

      financeService.getArSummary.mockResolvedValue(mockArSummary as any);
      financeService.getArAgingSummary.mockResolvedValue(mockAgingSummary as any);
      forecastService.getForecastOverview.mockResolvedValue(mockForecastOverview as any);
      commandCenterService.getOverview.mockResolvedValue(mockCommandCenterOverview as any);
      (prisma.workflowActionLog.count as jest.Mock).mockResolvedValue(25);

      const result = await service.buildWeeklyDigest();

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('periodStart');
      expect(result).toHaveProperty('periodEnd');
      expect(result.financeArSummary).toEqual(mockArSummary);
      expect(result.financeAgingSummary).toEqual(mockAgingSummary);
      expect(result.forecastOverview).toEqual(mockForecastOverview);
      expect(result.keyCounts).toHaveProperty('highRiskJobs', 5);
      expect(result.keyCounts).toHaveProperty('safetyIncidentsOpen', 2);
      expect(result.keyCounts).toHaveProperty('overdueArJobs', 2);
      expect(result.keyCounts).toHaveProperty('workflowsTriggeredLastPeriod', 25);
    });

    it('should call all services in parallel', async () => {
      const mockArSummary = { jobsOverdue: 0 } as any;
      const mockAgingSummary = { buckets: [] } as any;
      const mockForecastOverview = { cashflow: {}, pipeline: {} } as any;
      const mockCommandCenterOverview = { summary: { jobsHighRisk: 0, openSafetyIncidents: 0 } } as any;

      financeService.getArSummary.mockResolvedValue(mockArSummary);
      financeService.getArAgingSummary.mockResolvedValue(mockAgingSummary);
      forecastService.getForecastOverview.mockResolvedValue(mockForecastOverview);
      commandCenterService.getOverview.mockResolvedValue(mockCommandCenterOverview);
      (prisma.workflowActionLog.count as jest.Mock).mockResolvedValue(0);

      await service.buildWeeklyDigest();

      expect(financeService.getArSummary).toHaveBeenCalledTimes(1);
      expect(financeService.getArAgingSummary).toHaveBeenCalledTimes(1);
      expect(forecastService.getForecastOverview).toHaveBeenCalledWith(12);
      expect(commandCenterService.getOverview).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendWeeklyDigest', () => {
    it('should send digest email when recipients are configured', async () => {
      const mockDigest = {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        financeArSummary: {} as any,
        financeAgingSummary: { buckets: [] } as any,
        forecastOverview: {} as any,
        keyCounts: {} as any,
      };

      jest.spyOn(service, 'buildWeeklyDigest').mockResolvedValue(mockDigest);
      configService.get.mockReturnValue('owner@test.com,partner@test.com');

      await service.sendWeeklyDigest();

      expect(emailNotificationService.sendExecutiveDigestEmail).toHaveBeenCalledWith({
        digest: mockDigest,
        recipients: ['owner@test.com', 'partner@test.com'],
      });
    });

    it('should not send email when no recipients are configured', async () => {
      const mockDigest = {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        financeArSummary: {} as any,
        financeAgingSummary: { buckets: [] } as any,
        forecastOverview: {} as any,
        keyCounts: {} as any,
      };

      jest.spyOn(service, 'buildWeeklyDigest').mockResolvedValue(mockDigest);
      configService.get.mockReturnValue('');

      await service.sendWeeklyDigest();

      expect(emailNotificationService.sendExecutiveDigestEmail).not.toHaveBeenCalled();
    });

    it('should use recipientsOverride when provided', async () => {
      const mockDigest = {
        generatedAt: new Date().toISOString(),
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        financeArSummary: {} as any,
        financeAgingSummary: { buckets: [] } as any,
        forecastOverview: {} as any,
        keyCounts: {} as any,
      };

      jest.spyOn(service, 'buildWeeklyDigest').mockResolvedValue(mockDigest);

      const overrideRecipients = ['override@test.com'];
      await service.sendWeeklyDigest(new Date(), {
        recipientsOverride: overrideRecipients,
      });

      expect(emailNotificationService.sendExecutiveDigestEmail).toHaveBeenCalledWith({
        digest: mockDigest,
        recipients: overrideRecipients,
      });
      expect(configService.get).not.toHaveBeenCalled();
    });
  });

  describe('handleWeeklyDigestCron', () => {
    it('should call sendWeeklyDigest without throwing', async () => {
      jest.spyOn(service, 'sendWeeklyDigest').mockResolvedValue();

      await service.handleWeeklyDigestCron();

      expect(service.sendWeeklyDigest).toHaveBeenCalled();
    });

    it('should not throw when sendWeeklyDigest fails', async () => {
      jest.spyOn(service, 'sendWeeklyDigest').mockRejectedValue(new Error('Test error'));

      await expect(service.handleWeeklyDigestCron()).resolves.not.toThrow();
    });
  });
});
