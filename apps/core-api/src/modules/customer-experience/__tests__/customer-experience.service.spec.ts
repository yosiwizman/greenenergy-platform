import { Test, TestingModule } from '@nestjs/testing';
import { CustomerExperienceService } from '../customer-experience.service';
import { AiOperationsService } from '../../ai-ops/ai-operations.service';
import { EmailNotificationService } from '../../notifications/email-notification.service';
import { SmsNotificationService } from '../../notifications/sms-notification.service';
import { prisma } from '@greenenergy/db';
import { NotFoundException } from '@nestjs/common';

// Mock Prisma
jest.mock('@greenenergy/db', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
    },
    customerMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn(),
    },
    customerUser: {
      findFirst: jest.fn(),
    },
  },
}));

describe('CustomerExperienceService', () => {
  let service: CustomerExperienceService;
  let mockAiOperationsService: jest.Mocked<AiOperationsService>;
  let mockEmailNotificationService: jest.Mocked<EmailNotificationService>;
  let mockSmsNotificationService: jest.Mocked<SmsNotificationService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock AiOperationsService
    mockAiOperationsService = {
      generateCustomerMessage: jest.fn(),
    } as any;

    // Mock EmailNotificationService
    mockEmailNotificationService = {
      sendCustomerMessageEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock SmsNotificationService
    mockSmsNotificationService = {
      sendCustomerSms: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerExperienceService,
        { provide: AiOperationsService, useValue: mockAiOperationsService },
        { provide: EmailNotificationService, useValue: mockEmailNotificationService },
        { provide: SmsNotificationService, useValue: mockSmsNotificationService },
      ],
    }).compile();

    service = module.get<CustomerExperienceService>(CustomerExperienceService);
  });

  describe('getMessagesForJob', () => {
    const mockJob = { id: 'job-123', customerName: 'Test Customer' };
    const mockMessages = [
      {
        id: 'msg-1',
        jobId: 'job-123',
        type: 'STATUS_UPDATE',
        channel: 'PORTAL',
        source: 'HUMAN',
        title: 'Project Status Update',
        body: 'Your project is in progress',
        createdAt: new Date('2024-01-01'),
        readAt: null,
        metadataJson: null,
      },
      {
        id: 'msg-2',
        jobId: 'job-123',
        type: 'ETA_UPDATE',
        channel: 'PORTAL',
        source: 'AI_SUGGESTED',
        title: 'Installation Timeline Update',
        body: 'Your installation is scheduled',
        createdAt: new Date('2024-01-02'),
        readAt: null,
        metadataJson: { tone: 'FRIENDLY' },
      },
    ];

    it('should return messages for a job ordered by createdAt ASC', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await service.getMessagesForJob('job-123');

      expect(prisma.job.findUnique).toHaveBeenCalledWith({ where: { id: 'job-123' } });
      expect(prisma.customerMessage.findMany).toHaveBeenCalledWith({
        where: { jobId: 'job-123' },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('msg-1');
      expect(result[1]?.id).toBe('msg-2');
    });

    it('should throw NotFoundException when job does not exist', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMessagesForJob('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should correctly map Prisma model to DTO', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.findMany as jest.Mock).mockResolvedValue([mockMessages[0]]);

      const result = await service.getMessagesForJob('job-123');

      expect(result[0]).toMatchObject({
        id: 'msg-1',
        jobId: 'job-123',
        type: 'STATUS_UPDATE',
        channel: 'PORTAL',
        source: 'HUMAN',
        title: 'Project Status Update',
        body: 'Your project is in progress',
        readAt: null,
        metadataJson: null,
      });
      expect(result[0]?.createdAt).toBeDefined();
    });
  });

  describe('createMessageForJob', () => {
    const mockJob = { id: 'job-123', customerName: 'Test Customer' };
    const mockCreatedMessage = {
      id: 'msg-new',
      jobId: 'job-123',
      type: 'GENERIC',
      channel: 'PORTAL',
      source: 'HUMAN',
      title: 'Test Message',
      body: 'Test body',
      createdAt: new Date(),
      readAt: null,
      metadataJson: null,
    };

    it('should create a message with default channel and source', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage);

      const input = {
        type: 'GENERIC' as const,
        title: 'Test Message',
        body: 'Test body',
      };

      const result = await service.createMessageForJob('job-123', input);

      expect(prisma.customerMessage.create).toHaveBeenCalledWith({
        data: {
          jobId: 'job-123',
          type: 'GENERIC',
          channel: 'PORTAL', // default
          source: 'HUMAN', // default
          title: 'Test Message',
          body: 'Test body',
          metadataJson: null,
        },
      });
      expect(result.id).toBe('msg-new');
    });

    it('should use provided channel and source if specified', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue({
        ...mockCreatedMessage,
        channel: 'EMAIL',
        source: 'SYSTEM',
      });

      const input = {
        type: 'STATUS_UPDATE' as const,
        channel: 'EMAIL' as const,
        source: 'SYSTEM' as const,
        title: 'Test Message',
        body: 'Test body',
      };

      await service.createMessageForJob('job-123', input);

      expect(prisma.customerMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel: 'EMAIL',
          source: 'SYSTEM',
        }),
      });
    });

    it('should throw NotFoundException when job does not exist', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(null);

      const input = {
        type: 'GENERIC' as const,
        title: 'Test',
        body: 'Test',
      };

      await expect(service.createMessageForJob('nonexistent', input)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should send email when channel=EMAIL and sendEmail=true with customer email found', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue({
        ...mockCreatedMessage,
        channel: 'EMAIL',
      });
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue({
        email: 'customer@example.com',
      });

      const input = {
        type: 'STATUS_UPDATE' as const,
        channel: 'EMAIL' as const,
        title: 'Status Update',
        body: 'Your project is progressing',
        sendEmail: true,
      };

      await service.createMessageForJob('job-123', input);

      expect(mockEmailNotificationService.sendCustomerMessageEmail).toHaveBeenCalledWith({
        toEmail: 'customer@example.com',
        jobId: 'job-123',
        messageTitle: 'Test Message',
        messageBody: 'Test body',
        isAiGenerated: false,
      });
    });

    it('should NOT send email when channel=EMAIL but sendEmail=false', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue({
        ...mockCreatedMessage,
        channel: 'EMAIL',
      });

      const input = {
        type: 'STATUS_UPDATE' as const,
        channel: 'EMAIL' as const,
        title: 'Status Update',
        body: 'Your project is progressing',
        sendEmail: false,
      };

      await service.createMessageForJob('job-123', input);

      expect(mockEmailNotificationService.sendCustomerMessageEmail).not.toHaveBeenCalled();
    });

    it('should NOT send email when channel=PORTAL regardless of sendEmail flag', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage);

      const input = {
        type: 'STATUS_UPDATE' as const,
        channel: 'PORTAL' as const,
        title: 'Status Update',
        body: 'Your project is progressing',
        sendEmail: true,
      };

      await service.createMessageForJob('job-123', input);

      expect(mockEmailNotificationService.sendCustomerMessageEmail).not.toHaveBeenCalled();
    });

    it('should NOT throw when channel=EMAIL, sendEmail=true but no customer email found', async () => {
      (prisma.job.findUnique as jest.Mock).mockResolvedValue(mockJob);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue({
        ...mockCreatedMessage,
        channel: 'EMAIL',
      });
      (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.customerUser.findFirst as jest.Mock).mockResolvedValue(null);

      const input = {
        type: 'STATUS_UPDATE' as const,
        channel: 'EMAIL' as const,
        title: 'Status Update',
        body: 'Your project is progressing',
        sendEmail: true,
      };

      await expect(service.createMessageForJob('job-123', input)).resolves.not.toThrow();
      expect(mockEmailNotificationService.sendCustomerMessageEmail).not.toHaveBeenCalled();
    });
  });

  describe('markMessagesReadForJob', () => {
    it('should mark only unread messages as read', async () => {
      (prisma.customerMessage.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await service.markMessagesReadForJob('job-123');

      expect(prisma.customerMessage.updateMany).toHaveBeenCalledWith({
        where: {
          jobId: 'job-123',
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('createAutoMessageFromAi', () => {
    const mockJob = { id: 'job-123', customerName: 'Test Customer' };
    const mockAiResponse = {
      jobId: 'job-123',
      type: 'STATUS_UPDATE' as const,
      message: 'Hi Test Customer,\n\nYour solar installation project is progressing well...',
    };
    const mockCreatedMessage = {
      id: 'msg-ai',
      jobId: 'job-123',
      type: 'STATUS_UPDATE',
      channel: 'PORTAL',
      source: 'AI_SUGGESTED',
      title: 'Project Status Update',
      body: mockAiResponse.message,
      createdAt: new Date(),
      readAt: null,
      metadataJson: { tone: 'FRIENDLY' },
    };

    it('should create an AI-generated message with default tone', async () => {
      mockAiOperationsService.generateCustomerMessage.mockResolvedValue(mockAiResponse);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage);

      const result = await service.createAutoMessageFromAi('job-123', {
        messageType: 'STATUS_UPDATE',
      });

      expect(mockAiOperationsService.generateCustomerMessage).toHaveBeenCalledWith('job-123', {
        type: 'STATUS_UPDATE',
        tone: 'FRIENDLY',
        customQuestion: undefined,
      });

      expect(prisma.customerMessage.create).toHaveBeenCalledWith({
        data: {
          jobId: 'job-123',
          type: 'STATUS_UPDATE',
          channel: 'PORTAL',
          source: 'AI_SUGGESTED',
          title: 'Project Status Update',
          body: mockAiResponse.message,
          metadataJson: {
            tone: 'FRIENDLY',
            customPrompt: undefined,
          },
        },
      });

      expect(result.source).toBe('AI_SUGGESTED');
    });

    it('should use specified tone and customPrompt', async () => {
      mockAiOperationsService.generateCustomerMessage.mockResolvedValue(mockAiResponse);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage);

      await service.createAutoMessageFromAi('job-123', {
        messageType: 'ETA_UPDATE',
        tone: 'FORMAL',
        customPrompt: 'Include completion timeline',
      });

      expect(mockAiOperationsService.generateCustomerMessage).toHaveBeenCalledWith('job-123', {
        type: 'ETA_UPDATE',
        tone: 'FORMAL',
        customQuestion: 'Include completion timeline',
      });

      expect(prisma.customerMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadataJson: {
            tone: 'FORMAL',
            customPrompt: 'Include completion timeline',
          },
        }),
      });
    });

    it('should generate correct title for each message type', async () => {
      mockAiOperationsService.generateCustomerMessage.mockResolvedValue(mockAiResponse);
      (prisma.customerMessage.create as jest.Mock).mockResolvedValue(mockCreatedMessage);

      // Test STATUS_UPDATE
      await service.createAutoMessageFromAi('job-123', { messageType: 'STATUS_UPDATE' });
      expect((prisma.customerMessage.create as jest.Mock).mock.calls[0][0].data.title).toBe(
        'Project Status Update'
      );

      // Test ETA_UPDATE
      await service.createAutoMessageFromAi('job-123', { messageType: 'ETA_UPDATE' });
      expect((prisma.customerMessage.create as jest.Mock).mock.calls[1][0].data.title).toBe(
        'Installation Timeline Update'
      );

      // Test GENERIC
      await service.createAutoMessageFromAi('job-123', { messageType: 'GENERIC' });
      expect((prisma.customerMessage.create as jest.Mock).mock.calls[2][0].data.title).toBe(
        'Message from Your Solar Team'
      );
    });
  });
});
