import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { prisma } from '@greenenergy/db';
import { AiOperationsService } from '../ai-ops/ai-operations.service';
import { EmailNotificationService } from '../notifications/email-notification.service';
import type {
  CustomerMessageDTO,
  CreateCustomerMessageInput,
  CustomerMessageType,
} from '@greenenergy/shared-types';

@Injectable()
export class CustomerExperienceService {
  private readonly logger = new Logger(CustomerExperienceService.name);

  constructor(
    private readonly aiOperationsService: AiOperationsService,
    private readonly emailNotificationService: EmailNotificationService
  ) {}

  /**
   * Get all messages for a job, ordered by creation date (oldest first)
   */
  async getMessagesForJob(jobId: string): Promise<CustomerMessageDTO[]> {
    this.logger.log(`Fetching messages for job: ${jobId}`);

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const messages = await prisma.customerMessage.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(this.mapToDTO);
  }

  /**
   * Create a new message for a job
   */
  async createMessageForJob(
    jobId: string,
    input: CreateCustomerMessageInput
  ): Promise<CustomerMessageDTO> {
    this.logger.log(`Creating message for job ${jobId}, type: ${input.type}`);

    // Verify job exists
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const message = await prisma.customerMessage.create({
      data: {
        jobId,
        type: input.type,
        channel: input.channel || 'PORTAL',
        source: input.source || 'HUMAN',
        title: input.title,
        body: input.body,
        metadataJson: (input.metadataJson as any) ?? null,
      },
    });

    this.logger.log(`Message ${message.id} created successfully`);

    // Send email if requested and channel is EMAIL
    const shouldSendEmail = input.channel === 'EMAIL' && input.sendEmail === true;

    if (shouldSendEmail) {
      await this.sendEmailForMessage(job, message);
    }

    return this.mapToDTO(message);
  }

  /**
   * Mark all unread messages for a job as read
   */
  async markMessagesReadForJob(jobId: string): Promise<void> {
    this.logger.log(`Marking messages as read for job: ${jobId}`);

    await prisma.customerMessage.updateMany({
      where: {
        jobId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    this.logger.log(`Messages marked as read for job ${jobId}`);
  }

  /**
   * Create an AI-generated message for a job
   */
  async createAutoMessageFromAi(
    jobId: string,
    params: {
      messageType: CustomerMessageType;
      tone?: 'FRIENDLY' | 'FORMAL';
      customPrompt?: string;
    }
  ): Promise<CustomerMessageDTO> {
    this.logger.log(`Creating AI-generated ${params.messageType} message for job: ${jobId}`);

    // Only AI message types are supported (not PAYMENT_REMINDER)
    const aiMessageType = params.messageType as any; // Cast for now since AI doesn't support PAYMENT_REMINDER

    // Use AiOperationsService to generate message content
    const aiResponse = await this.aiOperationsService.generateCustomerMessage(jobId, {
      type: aiMessageType,
      tone: params.tone || 'FRIENDLY',
      customQuestion: params.customPrompt,
    });

    // Generate title based on message type
    const title = this.generateMessageTitle(params.messageType);

    // Create message with AI-generated content
    const message = await prisma.customerMessage.create({
      data: {
        jobId,
        type: params.messageType,
        channel: 'PORTAL',
        source: 'AI_SUGGESTED',
        title,
        body: aiResponse.message,
        metadataJson: {
          tone: params.tone || 'FRIENDLY',
          customPrompt: params.customPrompt,
        },
      },
    });

    this.logger.log(`AI-generated message ${message.id} created successfully`);
    return this.mapToDTO(message);
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDTO(message: any): CustomerMessageDTO {
    return {
      id: message.id,
      jobId: message.jobId,
      type: message.type as CustomerMessageDTO['type'],
      channel: message.channel as CustomerMessageDTO['channel'],
      source: message.source as CustomerMessageDTO['source'],
      title: message.title,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt ? message.readAt.toISOString() : null,
      metadataJson: message.metadataJson || null,
    };
  }

  /**
   * Generate a title based on message type
   */
  private generateMessageTitle(type: CustomerMessageType): string {
    const titles: Record<CustomerMessageType, string> = {
      STATUS_UPDATE: 'Project Status Update',
      ETA_UPDATE: 'Installation Timeline Update',
      GENERIC: 'Message from Your Solar Team',
      PAYMENT_REMINDER: 'Payment Reminder',
      INVOICE_ISSUED: 'Invoice Issued',
    };

    return titles[type];
  }

  /**
   * Send email for a message
   */
  private async sendEmailForMessage(job: any, message: any): Promise<void> {
    // Try to get customer email from contacts (primary first) or CustomerUser
    const customerEmail = await this.getCustomerEmailForJob(job.id);

    if (!customerEmail) {
      this.logger.warn(
        `CustomerExperienceService.createMessageForJob: no customer email for job ${job.id}, skipping email send.`
      );
      return;
    }

    const isAiGenerated = message.source === 'AI_SUGGESTED';

    await this.emailNotificationService.sendCustomerMessageEmail({
      toEmail: customerEmail,
      jobId: job.id,
      messageTitle: message.title,
      messageBody: message.body,
      isAiGenerated,
    });
  }

  /**
   * Get customer email for a job (from primary contact or first CustomerUser)
   */
  private async getCustomerEmailForJob(jobId: string): Promise<string | null> {
    // First try to get primary contact email
    const primaryContact = await prisma.contact.findFirst({
      where: { jobId, isPrimary: true, email: { not: null } },
      select: { email: true },
    });

    if (primaryContact?.email) {
      return primaryContact.email;
    }

    // Fallback to any contact with email
    const anyContact = await prisma.contact.findFirst({
      where: { jobId, email: { not: null } },
      select: { email: true },
    });

    if (anyContact?.email) {
      return anyContact.email;
    }

    // Final fallback to CustomerUser
    const customerUser = await prisma.customerUser.findFirst({
      where: { jobId },
      select: { email: true },
    });

    return customerUser?.email || null;
  }
}
