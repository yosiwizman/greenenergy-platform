import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import type {
  AiJobSummaryDTO,
  AiJobRecommendationDTO,
  AiCustomerMessageDTO,
  AiCustomerMessageRequestDTO,
  AiJobSummarySection,
  MaterialEtaStatus,
  AiOpsLlmJobSummaryDTO,
  AiOpsLlmCustomerMessageInputDTO,
  AiOpsLlmCustomerMessageDTO,
} from '@greenenergy/shared-types';
import { LlmService } from '../llm/llm.service';
import { LlmUsageService } from '../llm-usage/llm-usage.service';

@Injectable()
export class AiOperationsService {
  private readonly logger = new Logger(AiOperationsService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly llmUsageService: LlmUsageService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Get comprehensive job summary with AI-generated insights
   */
  async getJobSummary(jobId: string): Promise<AiJobSummaryDTO> {
    this.logger.log(`Generating AI summary for job: ${jobId}`);

    const jobData = await this.fetchJobData(jobId);
    if (!jobData) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const overallSummary = this.generateOverallSummary(jobData);
    const sections = this.generateSummarySections(jobData);

    return {
      jobId: jobData.id,
      jobNumber: jobData.jobNimbusId || null,
      customerName: jobData.customerName || null,
      status: jobData.status,
      overallSummary,
      sections,
    };
  }

  /**
   * Get actionable recommendations for the job
   */
  async getJobRecommendations(jobId: string): Promise<AiJobRecommendationDTO[]> {
    this.logger.log(`Generating recommendations for job: ${jobId}`);

    const jobData = await this.fetchJobData(jobId);
    if (!jobData) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return this.generateRecommendations(jobData);
  }

  /**
   * Get both summary and recommendations in one call
   */
  async getJobInsights(jobId: string): Promise<{
    summary: AiJobSummaryDTO;
    recommendations: AiJobRecommendationDTO[];
  }> {
    this.logger.log(`Generating comprehensive insights for job: ${jobId}`);

    const jobData = await this.fetchJobData(jobId);
    if (!jobData) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const summary = {
      jobId: jobData.id,
      jobNumber: jobData.jobNimbusId || null,
      customerName: jobData.customerName || null,
      status: jobData.status,
      overallSummary: this.generateOverallSummary(jobData),
      sections: this.generateSummarySections(jobData),
    };

    const recommendations = this.generateRecommendations(jobData);

    return { summary, recommendations };
  }

  /**
   * Generate customer-facing message based on job data and request type
   */
  async generateCustomerMessage(
    jobId: string,
    input: AiCustomerMessageRequestDTO
  ): Promise<AiCustomerMessageDTO> {
    this.logger.log(`Generating ${input.type} customer message for job: ${jobId}`);

    const jobData = await this.fetchJobData(jobId);
    if (!jobData) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const message = this.buildCustomerMessage(jobData, input);

    return {
      jobId: jobData.id,
      type: input.type,
      message,
    };
  }

  /**
   * Fetch all relevant job data from database
   */
  private async fetchJobData(jobId: string) {
    return prisma.job.findUnique({
      where: { id: jobId },
      include: {
        qcPhotoChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 1,
        },
        riskSnapshot: true,
        safetyIncidents: {
          where: {
            status: { in: ['OPEN', 'UNDER_REVIEW'] },
          },
        },
        materialOrders: true,
        warranties: {
          include: {
            claims: {
              where: {
                status: { in: ['OPEN', 'IN_REVIEW'] },
              },
            },
          },
        },
        subcontractorAssignments: {
          where: {
            unassignedAt: null,
            isPrimary: true,
          },
          include: {
            subcontractor: {
              select: {
                name: true,
                performanceStatus: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Generate overall summary paragraph
   */
  private generateOverallSummary(jobData: any): string {
    const parts: string[] = [];

    // Job status
    parts.push(`This job is currently in ${jobData.status} status`);

    // QC status
    const latestQC = jobData.qcPhotoChecks?.[0];
    if (latestQC) {
      if (latestQC.status === 'PASS') {
        parts.push('with all quality checks passing');
      } else if (latestQC.status === 'FAIL') {
        parts.push('with outstanding photo requirements');
      }
    }

    // Risk level
    if (jobData.riskSnapshot) {
      const risk = jobData.riskSnapshot.riskLevel;
      if (risk === 'HIGH') {
        parts.push('and requires immediate attention due to high risk flags');
      } else if (risk === 'MEDIUM') {
        parts.push('with moderate risk factors to monitor');
      }
    }

    // Safety
    const openIncidents = jobData.safetyIncidents?.length || 0;
    if (openIncidents > 0) {
      parts.push(
        `There ${openIncidents === 1 ? 'is' : 'are'} ${openIncidents} open safety incident${openIncidents > 1 ? 's' : ''} requiring follow-up`
      );
    }

    // Materials
    const materialEta = this.computeWorstMaterialEta(jobData.materialOrders || []);
    if (materialEta === 'LATE') {
      parts.push('Material deliveries are currently delayed');
    } else if (materialEta === 'AT_RISK') {
      parts.push('Material deliveries are approaching their expected dates');
    }

    return parts.join('. ') + '.';
  }

  /**
   * Generate detailed sections for different aspects of the job
   */
  private generateSummarySections(jobData: any): AiJobSummarySection[] {
    const sections: AiJobSummarySection[] = [];

    // Status & Progress
    sections.push({
      title: 'Status & Progress',
      body: this.generateStatusSection(jobData),
    });

    // Quality & Photos
    sections.push({
      title: 'Quality & Photos',
      body: this.generateQCSection(jobData),
    });

    // Safety & Compliance
    if (jobData.safetyIncidents?.length > 0 || jobData.subcontractorAssignments?.length > 0) {
      sections.push({
        title: 'Safety & Compliance',
        body: this.generateSafetySection(jobData),
      });
    }

    // Materials & Scheduling
    if (jobData.materialOrders?.length > 0) {
      sections.push({
        title: 'Materials & Scheduling',
        body: this.generateMaterialsSection(jobData),
      });
    }

    // Warranty & Service
    if (jobData.warranties?.length > 0) {
      sections.push({
        title: 'Warranty & Service',
        body: this.generateWarrantySection(jobData),
      });
    }

    return sections;
  }

  private generateStatusSection(jobData: any): string {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(jobData.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `Job is in ${jobData.status} status. Last updated ${daysSinceUpdate} day${daysSinceUpdate !== 1 ? 's' : ''} ago.`;
  }

  private generateQCSection(jobData: any): string {
    const latestQC = jobData.qcPhotoChecks?.[0];
    if (!latestQC) {
      return 'No quality checks have been performed yet.';
    }

    if (latestQC.status === 'PASS') {
      return 'All required photos have been uploaded and verified.';
    }

    const missing = JSON.parse(latestQC.missingCategoriesJson);
    const missingDetails = missing
      .map((m: any) => `${m.category} (${m.actualCount}/${m.requiredCount})`)
      .join(', ');
    return `Missing required photos: ${missingDetails}. Upload additional photos to meet requirements.`;
  }

  private generateSafetySection(jobData: any): string {
    const parts: string[] = [];

    const openIncidents = jobData.safetyIncidents?.length || 0;
    if (openIncidents > 0) {
      const highSeverity = jobData.safetyIncidents.filter(
        (i: any) => i.severity === 'HIGH' || i.severity === 'CRITICAL'
      ).length;
      if (highSeverity > 0) {
        parts.push(
          `${highSeverity} high-severity safety incident${highSeverity > 1 ? 's' : ''} require immediate attention`
        );
      } else {
        parts.push(
          `${openIncidents} open safety incident${openIncidents > 1 ? 's' : ''} to review`
        );
      }
    }

    const subcontractor = jobData.subcontractorAssignments?.[0]?.subcontractor;
    if (subcontractor) {
      const status = subcontractor.performanceStatus;
      if (status === 'RED') {
        parts.push(`Primary subcontractor ${subcontractor.name} has performance issues`);
      } else if (status === 'GREEN') {
        parts.push(`Primary subcontractor ${subcontractor.name} performing well`);
      }
    }

    return parts.length > 0 ? parts.join('. ') + '.' : 'No safety concerns at this time.';
  }

  private generateMaterialsSection(jobData: any): string {
    const orders = jobData.materialOrders || [];
    const etaStatus = this.computeWorstMaterialEta(orders);

    if (etaStatus === 'LATE') {
      const lateOrders = orders.filter((o: any) => this.computeOrderEta(o) === 'LATE');
      return `${lateOrders.length} material order${lateOrders.length > 1 ? 's are' : ' is'} past expected delivery date. Contact suppliers or adjust schedule.`;
    }

    if (etaStatus === 'AT_RISK') {
      return 'Some materials are approaching their delivery dates. Monitor closely.';
    }

    const delivered = orders.filter((o: any) => o.status === 'DELIVERED').length;
    return `${delivered} of ${orders.length} material order${orders.length > 1 ? 's' : ''} delivered. Remaining orders on track.`;
  }

  private generateWarrantySection(jobData: any): string {
    const warranty = jobData.warranties?.[0];
    if (!warranty) {
      return 'No warranty information available.';
    }

    const openClaims = warranty.claims?.length || 0;
    if (openClaims > 0) {
      return `Warranty is ${warranty.status}. ${openClaims} open claim${openClaims > 1 ? 's' : ''} requiring attention.`;
    }

    return `Warranty is ${warranty.status} with no open claims.`;
  }

  /**
   * Generate actionable recommendations based on job data
   */
  private generateRecommendations(jobData: any): AiJobRecommendationDTO[] {
    const recommendations: AiJobRecommendationDTO[] = [];

    // QC recommendations
    const latestQC = jobData.qcPhotoChecks?.[0];
    if (latestQC && latestQC.status === 'FAIL') {
      const missing = JSON.parse(latestQC.missingCategoriesJson);
      const categories = missing.map((m: any) => m.category).join(', ');
      recommendations.push({
        id: 'upload-missing-qc-photos',
        label: 'Upload Missing QC Photos',
        description: `Required photo categories are incomplete: ${categories}. Upload photos to meet quality standards and proceed with inspection.`,
        category: 'QC',
        priority: 'HIGH',
      });
    }

    // Risk recommendations
    if (jobData.riskSnapshot?.riskLevel === 'HIGH') {
      const reasonsJson = JSON.parse(jobData.riskSnapshot.reasonsJson);
      const mainReason = reasonsJson[0]?.label || 'multiple issues';
      recommendations.push({
        id: 'review-risk-flags',
        label: 'Review High Risk Flags',
        description: `This job has HIGH risk level due to ${mainReason}. Review risk dashboard for detailed issues and take corrective action immediately.`,
        category: 'RISK',
        priority: 'HIGH',
      });
    }

    // Safety recommendations
    const criticalIncidents = jobData.safetyIncidents?.filter(
      (i: any) => i.severity === 'CRITICAL' || i.severity === 'HIGH'
    );
    if (criticalIncidents && criticalIncidents.length > 0) {
      recommendations.push({
        id: 'follow-up-safety-incidents',
        label: 'Follow Up on Safety Incidents',
        description: `${criticalIncidents.length} high-severity safety incident${criticalIncidents.length > 1 ? 's' : ''} require immediate follow-up. Review incidents and implement corrective actions.`,
        category: 'SAFETY',
        priority: 'HIGH',
      });
    }

    // Materials recommendations
    const lateOrders = (jobData.materialOrders || []).filter(
      (o: any) => this.computeOrderEta(o) === 'LATE'
    );
    if (lateOrders.length > 0) {
      recommendations.push({
        id: 'contact-supplier-or-reschedule',
        label: 'Contact Supplier or Reschedule',
        description: `${lateOrders.length} material order${lateOrders.length > 1 ? 's are' : ' is'} delayed. Contact suppliers for updated ETA or adjust installation schedule.`,
        category: 'MATERIALS',
        priority: 'HIGH',
      });
    }

    // Warranty recommendations
    const openWarrantyClaims = jobData.warranties?.[0]?.claims?.length || 0;
    if (openWarrantyClaims > 0) {
      recommendations.push({
        id: 'prioritize-warranty-claim',
        label: 'Prioritize Warranty Claims',
        description: `${openWarrantyClaims} open warranty claim${openWarrantyClaims > 1 ? 's' : ''} need${openWarrantyClaims === 1 ? 's' : ''} attention. Review and respond to maintain customer satisfaction.`,
        category: 'WARRANTY',
        priority: 'MEDIUM',
      });
    }

    // Subcontractor recommendations
    const subcontractor = jobData.subcontractorAssignments?.[0]?.subcontractor;
    if (subcontractor?.performanceStatus === 'RED') {
      recommendations.push({
        id: 'review-subcontractor-performance',
        label: 'Review Subcontractor Performance',
        description: `Primary subcontractor ${subcontractor.name} has RED performance status. Consider reassignment or additional oversight.`,
        category: 'SCHEDULING',
        priority: 'HIGH',
      });
    }

    // General recommendation (always include one)
    recommendations.push(this.generateGeneralRecommendation(jobData, recommendations));

    return recommendations;
  }

  private generateGeneralRecommendation(
    jobData: any,
    existingRecs: AiJobRecommendationDTO[]
  ): AiJobRecommendationDTO {
    const hasHighPriority = existingRecs.some((r) => r.priority === 'HIGH');

    if (hasHighPriority) {
      return {
        id: 'address-high-priority-items',
        label: 'Address High Priority Items',
        description: `Focus on resolving ${existingRecs.filter((r) => r.priority === 'HIGH').length} high-priority issue${existingRecs.filter((r) => r.priority === 'HIGH').length > 1 ? 's' : ''} to keep this job on track.`,
        category: 'GENERAL',
        priority: 'HIGH',
      };
    }

    return {
      id: 'maintain-momentum',
      label: 'Maintain Momentum',
      description:
        'Job is progressing well. Continue monitoring quality, safety, and schedule to ensure successful completion.',
      category: 'GENERAL',
      priority: 'LOW',
    };
  }

  /**
   * Build customer-facing message based on request type
   */
  private buildCustomerMessage(jobData: any, input: AiCustomerMessageRequestDTO): string {
    const isFriendly = input.tone === 'FRIENDLY';
    const greeting = isFriendly ? 'Hi' : 'Hello';
    const customerName = jobData.customerName || 'valued customer';

    switch (input.type) {
      case 'STATUS_UPDATE':
        return this.buildStatusUpdateMessage(jobData, greeting, customerName, isFriendly);

      case 'ETA_UPDATE':
        return this.buildEtaUpdateMessage(jobData, greeting, customerName, isFriendly);

      case 'GENERIC':
        return this.buildGenericMessage(jobData, input, greeting, customerName, isFriendly);

      default:
        return `${greeting} ${customerName}, thank you for choosing us for your solar installation project.`;
    }
  }

  private buildStatusUpdateMessage(
    jobData: any,
    greeting: string,
    customerName: string,
    friendly: boolean
  ): string {
    const status = jobData.status.toLowerCase().replace('_', ' ');
    const closingLine = friendly
      ? 'We appreciate your patience and look forward to completing your project!'
      : 'Thank you for your continued cooperation.';

    const nextStep = this.getNextStep(jobData.status);

    return `${greeting} ${customerName},\n\nYour solar installation project is currently in ${status} status. ${nextStep}\n\n${closingLine}`;
  }

  private buildEtaUpdateMessage(
    jobData: any,
    greeting: string,
    customerName: string,
    friendly: boolean
  ): string {
    const materials = jobData.materialOrders || [];
    const closingLine = friendly
      ? "Thank you for your patience! We're excited to complete your installation."
      : 'We appreciate your understanding.';

    if (materials.length === 0) {
      return `${greeting} ${customerName},\n\nWe're currently working on scheduling your installation. We'll provide a timeline once all materials are confirmed.\n\n${closingLine}`;
    }

    const eta = this.computeWorstMaterialEta(materials);
    if (eta === 'LATE') {
      return `${greeting} ${customerName},\n\nWe're experiencing a slight delay with some material deliveries. Our team is working with suppliers to expedite delivery. We'll update you as soon as we have a confirmed installation date.\n\n${closingLine}`;
    }

    if (eta === 'AT_RISK') {
      return `${greeting} ${customerName},\n\nYour materials are on track to arrive this week. Once they're received and inspected, we'll schedule your installation within the next few days.\n\n${closingLine}`;
    }

    return `${greeting} ${customerName},\n\nAll materials for your project have been received or are on schedule. We're coordinating with our installation team and will confirm your installation date shortly.\n\n${closingLine}`;
  }

  private buildGenericMessage(
    jobData: any,
    input: AiCustomerMessageRequestDTO,
    greeting: string,
    customerName: string,
    friendly: boolean
  ): string {
    const closingLine = friendly
      ? 'Feel free to reach out if you have any other questions!'
      : "Please don't hesitate to contact us with further questions.";

    const question = input.customQuestion || 'your inquiry';
    const status = jobData.status.toLowerCase().replace('_', ' ');

    return `${greeting} ${customerName},\n\nThank you for ${question}. Your project is currently in ${status} status, and our team is working diligently to ensure everything proceeds smoothly.\n\n${closingLine}`;
  }

  private getNextStep(status: string): string {
    const steps: Record<string, string> = {
      LEAD: 'Our team will contact you soon to schedule a site survey.',
      QUALIFIED: "We're preparing for your site survey.",
      SITE_SURVEY: 'Our team is conducting the site assessment.',
      DESIGN: "We're designing your custom solar system.",
      PERMITTING: "We're working on securing the necessary permits.",
      APPROVED: 'All permits are approved. Installation will be scheduled soon.',
      SCHEDULED: 'Your installation date is confirmed.',
      IN_PROGRESS: 'Our installation team is actively working on your project.',
      INSPECTION: 'Final inspections are being completed.',
      COMPLETE: 'Your installation is complete. Welcome to solar power!',
    };

    return steps[status] || "We'll update you as the project progresses.";
  }

  private computeOrderEta(order: any): MaterialEtaStatus {
    if (order.status === 'DELIVERED') return 'ON_TRACK';
    if (!order.expectedDeliveryDate) return 'AT_RISK';

    const now = new Date();
    const expected = new Date(order.expectedDeliveryDate);

    if (expected < now && !order.actualDeliveryDate) return 'LATE';

    const daysUntil = Math.ceil((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3 && daysUntil >= 0) return 'AT_RISK';

    return 'ON_TRACK';
  }

  private computeWorstMaterialEta(orders: any[]): MaterialEtaStatus {
    if (!orders || orders.length === 0) return 'ON_TRACK';

    const statuses = orders.map((o) => this.computeOrderEta(o));
    if (statuses.includes('LATE')) return 'LATE';
    if (statuses.includes('AT_RISK')) return 'AT_RISK';
    return 'ON_TRACK';
  }

  /**
   * Generate job summary using LLM with fallback to rule-based summary
   * Phase 10 Sprint 1 - LLM Integration
   */
  async generateJobSummaryWithLlm(jobId: string): Promise<AiOpsLlmJobSummaryDTO> {
    const enableAiOps = this.configService.get<string>('ENABLE_LLM_FOR_AI_OPS') === 'true';
    
    if (!enableAiOps || !this.llmService.isEnabled()) {
      this.logger.log(`LLM disabled for AI Ops, using fallback for job: ${jobId}`);

      const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
      void this.llmUsageService.logCall({
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId,
        provider: this.configService.get<string>('LLM_PROVIDER') ?? null,
        model: 'deterministic-fallback',
        tokensIn: null,
        tokensOut: null,
        durationMs: null,
        isFallback: true,
        success: true,
        errorCode: !enableAiOps
          ? 'LLM_DISABLED'
          : !this.llmService.isEnabled()
          ? 'LLM_NOT_CONFIGURED'
          : null,
        environment,
      });

      const fallback = await this.getJobSummary(jobId);
      return {
        jobId,
        summary: this.formatFallbackSummary(fallback),
        recommendations: this.formatFallbackRecommendations(
          await this.getJobRecommendations(jobId)
        ),
        model: 'deterministic-fallback',
        isFallback: true,
      };
    }

    let llmStartedAt: number | null = null;

    try {
      const context = await this.buildJobContextForLlm(jobId);
      const systemPrompt = `You are an expert operations assistant for a roofing and solar installation company.
Given job data, you must:
- Summarize current status in 4–7 bullet points
- Highlight risks (QC, safety, AR, schedule, subcontractor performance)
- Suggest the 3 most important next actions for the internal team
Use clear, professional language. Do not include internal IDs or raw database values.`;

      const userPrompt = `Here is the job context:

${context}

Return:
1) "Summary" – 4–7 bullet points
2) "Risks" – 2–4 bullet points
3) "Next actions" – 3 bullet points

Keep under 500 words.`;

      llmStartedAt = Date.now();
      const result = await this.llmService.generateText({
        systemPrompt,
        userPrompt,
        input: { purpose: 'AI_OPS_SUMMARY' },
      });
      const durationMs = Date.now() - llmStartedAt;

      const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
      void this.llmUsageService.logCall({
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId,
        provider: this.configService.get<string>('LLM_PROVIDER') ?? null,
        model: result.model,
        tokensIn: result.usage?.promptTokens ?? null,
        tokensOut: result.usage?.completionTokens ?? null,
        durationMs,
        isFallback: false,
        success: true,
        errorCode: null,
        environment,
        meta: {
          purpose: 'AI_OPS_SUMMARY',
        },
      });

      return {
        jobId,
        summary: result.text,
        model: result.model,
        isFallback: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`LLM generation failed for job ${jobId}: ${errorMessage}`);

      const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
      void this.llmUsageService.logCall({
        feature: 'AI_OPS_JOB_SUMMARY',
        jobId,
        provider: this.configService.get<string>('LLM_PROVIDER') ?? null,
        model: 'deterministic-fallback',
        tokensIn: null,
        tokensOut: null,
        durationMs: llmStartedAt ? Date.now() - llmStartedAt : null,
        isFallback: true,
        success: true,
        errorCode: errorMessage,
        environment,
      });

      const fallback = await this.getJobSummary(jobId);
      return {
        jobId,
        summary: this.formatFallbackSummary(fallback),
        recommendations: this.formatFallbackRecommendations(
          await this.getJobRecommendations(jobId)
        ),
        model: 'deterministic-fallback',
        isFallback: true,
      };
    }
  }

  /**
   * Generate customer message using LLM with fallback to template-based message
   * Phase 10 Sprint 1 - LLM Integration
   */
  async generateCustomerMessageWithLlm(
    input: AiOpsLlmCustomerMessageInputDTO
  ): Promise<AiOpsLlmCustomerMessageDTO> {
    const enableCxMessages = this.configService.get<string>('ENABLE_LLM_FOR_CX_MESSAGES') === 'true';
    const tone = input.tone ?? 'friendly';

    if (!enableCxMessages || !this.llmService.isEnabled()) {
      this.logger.log(`LLM disabled for CX messages, using fallback for job: ${input.jobId}`);

      const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
      void this.llmUsageService.logCall({
        feature: 'AI_OPS_CUSTOMER_MESSAGE',
        jobId: input.jobId,
        provider: this.configService.get<string>('LLM_PROVIDER') ?? null,
        model: 'deterministic-fallback',
        tokensIn: null,
        tokensOut: null,
        durationMs: null,
        isFallback: true,
        success: true,
        errorCode: !enableCxMessages
          ? 'LLM_DISABLED'
          : !this.llmService.isEnabled()
          ? 'LLM_NOT_CONFIGURED'
          : null,
        environment,
        meta: {
          tone,
          context: input.context ?? 'general_update',
        },
      });

      const fallback = await this.buildTemplateCustomerMessage(input);
      return {
        jobId: input.jobId,
        tone,
        message: fallback,
        model: 'deterministic-fallback',
        isFallback: true,
      };
    }

    let llmStartedAt: number | null = null;

    try {
      const context = await this.buildJobContextForLlm(input.jobId);
      const toneInstruction =
        tone === 'formal'
          ? 'Use formal, respectful language.'
          : tone === 'direct'
          ? 'Use direct, clear language.'
          : 'Use friendly, reassuring language.';

      const systemPrompt = `You are writing messages to homeowners for a roofing and solar installation company.
${toneInstruction}
Do not mention internal systems or technical details. Be clear and concise.
Never make legal promises or guarantees.`;

      const contextType = input.context ?? 'general_update';
      const userPrompt = `Job context:
${context}

Write a message to the customer with context "${contextType}".
Keep it under 180 words. Avoid legal promises or guarantees.`;

      llmStartedAt = Date.now();
      const result = await this.llmService.generateText({
        systemPrompt,
        userPrompt,
        input: { purpose: 'CX_MESSAGE' },
      });
      const durationMs = Date.now() - llmStartedAt;

      const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
      void this.llmUsageService.logCall({
        feature: 'AI_OPS_CUSTOMER_MESSAGE',
        jobId: input.jobId,
        provider: this.configService.get<string>('LLM_PROVIDER') ?? null,
        model: result.model,
        tokensIn: result.usage?.promptTokens ?? null,
        tokensOut: result.usage?.completionTokens ?? null,
        durationMs,
        isFallback: false,
        success: true,
        errorCode: null,
        environment,
        meta: {
          purpose: 'CX_MESSAGE',
          tone,
          context: input.context ?? 'general_update',
        },
      });

      return {
        jobId: input.jobId,
        tone,
        message: result.text,
        model: result.model,
        isFallback: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `LLM generation failed for customer message job ${input.jobId}: ${errorMessage}`
      );

      const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'unknown';
      void this.llmUsageService.logCall({
        feature: 'AI_OPS_CUSTOMER_MESSAGE',
        jobId: input.jobId,
        provider: this.configService.get<string>('LLM_PROVIDER') ?? null,
        model: 'deterministic-fallback',
        tokensIn: null,
        tokensOut: null,
        durationMs: llmStartedAt ? Date.now() - llmStartedAt : null,
        isFallback: true,
        success: true,
        errorCode: errorMessage,
        environment,
        meta: {
          tone,
          context: input.context ?? 'general_update',
        },
      });

      const fallback = await this.buildTemplateCustomerMessage(input);
      return {
        jobId: input.jobId,
        tone,
        message: fallback,
        model: 'deterministic-fallback',
        isFallback: true,
      };
    }
  }

  /**
   * Build formatted job context string for LLM prompts
   */
  private async buildJobContextForLlm(jobId: string): Promise<string> {
    const jobData = await this.fetchJobData(jobId);
    if (!jobData) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    const sections: string[] = [];

    sections.push(`Job: ${jobData.customerName || 'Unknown'}`);
    sections.push(`Status: ${jobData.status}`);
    sections.push(
      `Last Updated: ${Math.floor((Date.now() - new Date(jobData.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
    );

    // QC
    const latestQC = jobData.qcPhotoChecks?.[0];
    if (latestQC) {
      sections.push(`QC Status: ${latestQC.status}`);
      if (latestQC.status === 'FAIL') {
        const missing = JSON.parse(latestQC.missingCategoriesJson);
        sections.push(
          `Missing Photos: ${missing.map((m: any) => `${m.category} (${m.actualCount}/${m.requiredCount})`).join(', ')}`
        );
      }
    }

    // Risk
    if (jobData.riskSnapshot) {
      sections.push(`Risk Level: ${jobData.riskSnapshot.riskLevel}`);
      const reasons = JSON.parse(jobData.riskSnapshot.reasonsJson);
      if (reasons.length > 0) {
        sections.push(`Risk Reasons: ${reasons.map((r: any) => r.label).join(', ')}`);
      }
    }

    // Safety
    const openIncidents = jobData.safetyIncidents?.length || 0;
    if (openIncidents > 0) {
      sections.push(`Open Safety Incidents: ${openIncidents}`);
    }

    // Materials
    const materialOrders = jobData.materialOrders || [];
    if (materialOrders.length > 0) {
      const etaStatus = this.computeWorstMaterialEta(materialOrders);
      sections.push(`Materials Status: ${etaStatus}`);
    }

    // Subcontractor
    const subcontractor = jobData.subcontractorAssignments?.[0]?.subcontractor;
    if (subcontractor) {
      sections.push(
        `Subcontractor: ${subcontractor.name} (${subcontractor.performanceStatus})`
      );
    }

    // Warranties
    const warranty = jobData.warranties?.[0];
    if (warranty) {
      const openClaims = warranty.claims?.length || 0;
      sections.push(
        `Warranty: ${warranty.status}${openClaims > 0 ? ` (${openClaims} open claims)` : ''}`
      );
    }

    return sections.join('\n');
  }

  /**
   * Format rule-based summary for fallback response
   */
  private formatFallbackSummary(summary: AiJobSummaryDTO): string {
    const sections = [
      `Overall: ${summary.overallSummary}`,
      '',
      ...summary.sections.map((s) => `${s.title}:\n${s.body}`),
    ];
    return sections.join('\n\n');
  }

  /**
   * Format rule-based recommendations for fallback response
   */
  private formatFallbackRecommendations(recommendations: AiJobRecommendationDTO[]): string {
    if (recommendations.length === 0) return '';
    return (
      'Recommendations:\n' +
      recommendations
        .slice(0, 3)
        .map((r) => `- ${r.label}: ${r.description}`)
        .join('\n')
    );
  }

  /**
   * Build template-based customer message for fallback
   */
  private async buildTemplateCustomerMessage(
    input: AiOpsLlmCustomerMessageInputDTO
  ): Promise<string> {
    const jobData = await this.fetchJobData(input.jobId);
    if (!jobData) {
      throw new NotFoundException(`Job with ID ${input.jobId} not found`);
    }

    const tone = input.tone ?? 'friendly';
    const context = input.context ?? 'general_update';
    const isFriendly = tone === 'friendly';
    const greeting = isFriendly ? 'Hi' : 'Hello';
    const customerName = jobData.customerName || 'valued customer';
    const status = jobData.status.toLowerCase().replace('_', ' ');

    const messages: Record<string, string> = {
      general_update: `${greeting} ${customerName},\\n\\nYour project is currently in ${status} status. Our team is working diligently to ensure everything proceeds smoothly. We'll keep you updated on progress.\\n\\nThank you for choosing us!`,
      payment_reminder: `${greeting} ${customerName},\\n\\nThis is a friendly reminder regarding payment for your project. Your project is in ${status} status. Please contact our office if you have any questions about your invoice.\\n\\nThank you for your prompt attention.`,
      scheduling: `${greeting} ${customerName},\\n\\nWe're working on scheduling the next phase of your project (currently in ${status}). We'll reach out shortly to confirm a date that works for you.\\n\\nThank you for your flexibility!`,
      post_install: `${greeting} ${customerName},\\n\\nThank you for choosing us for your solar installation! Your system is now complete. Please let us know if you have any questions or concerns.\\n\\nWelcome to solar power!`,
    };

    return (messages[context] || messages.general_update) as string;
  }
}
