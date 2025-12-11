import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@greenenergy/db';
import { JobNimbusClient } from '@greenenergy/jobnimbus-sdk';
import { differenceInCalendarDays } from 'date-fns';
import { CustomerExperienceService } from '../customer-experience/customer-experience.service';
import type {
  WorkflowActionLogDTO,
  WorkflowRuleSummaryDTO,
  WorkflowDepartment,
  WorkflowActionType,
} from '@greenenergy/shared-types';

/**
 * Workflow rule definition
 */
interface WorkflowRule {
  key: string;
  name: string;
  description: string;
  department: WorkflowDepartment;
  enabled: boolean;
  cooldownDays: number;
  evaluate: (jobId: string) => Promise<WorkflowActionLogDTO | null>;
}

/**
 * WorkflowService implements the automated workflow engine
 * that evaluates jobs against rules and creates JobNimbus tasks/notes
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private jobNimbusClient: JobNimbusClient | null = null;
  private rules: WorkflowRule[] = [];

  constructor(
    private configService: ConfigService,
    private customerExperienceService: CustomerExperienceService
  ) {
    const baseUrl = this.configService.get<string>('JOBNIMBUS_BASE_URL');
    const apiKey = this.configService.get<string>('JOBNIMBUS_API_KEY');

    if (baseUrl && apiKey) {
      this.jobNimbusClient = new JobNimbusClient({ baseUrl, apiKey });
      this.logger.log('JobNimbus client initialized for workflow automation');
    } else {
      this.logger.warn('JobNimbus credentials not configured - workflow automation disabled');
    }

    this.initializeRules();
  }

  /**
   * Initialize all workflow rules (v1 - hard-coded)
   */
  private initializeRules(): void {
    this.rules = [
      // SALES RULES
      {
        key: 'SALES_ESTIMATE_FOLLOWUP_72H',
        name: 'Sales Estimate Follow-up (72h)',
        description: 'Follow up on estimate sent with no update for 72 hours',
        department: 'SALES',
        enabled: true,
        cooldownDays: 7,
        evaluate: this.evaluateSalesEstimateFollowup.bind(this),
      },

      // PRODUCTION RULES
      {
        key: 'PRODUCTION_QC_FAIL_NEEDS_PHOTOS',
        name: 'Production QC Failed - Missing Photos',
        description: 'QC check failed due to missing required photos',
        department: 'PRODUCTION',
        enabled: true,
        cooldownDays: 3,
        evaluate: this.evaluateProductionQcFailPhotos.bind(this),
      },
      {
        key: 'PRODUCTION_MATERIAL_DELAY',
        name: 'Production Material Delay',
        description: 'Material order is late and affecting production schedule',
        department: 'PRODUCTION',
        enabled: true,
        cooldownDays: 2,
        evaluate: this.evaluateProductionMaterialDelay.bind(this),
      },

      // ADMIN RULES
      {
        key: 'ADMIN_SUB_NONCOMPLIANT_ASSIGNED',
        name: 'Admin Non-Compliant Subcontractor Assigned',
        description: 'Job has non-compliant subcontractor assigned',
        department: 'ADMIN',
        enabled: true,
        cooldownDays: 1,
        evaluate: this.evaluateAdminSubNoncompliant.bind(this),
      },

      // SAFETY RULES
      {
        key: 'SAFETY_OPEN_HIGH_SEVERITY_INCIDENT',
        name: 'Safety High Severity Incident Open',
        description: 'Open high or critical severity safety incident requires follow-up',
        department: 'SAFETY',
        enabled: true,
        cooldownDays: 1,
        evaluate: this.evaluateSafetyHighSeverityIncident.bind(this),
      },

      // WARRANTY RULES
      {
        key: 'WARRANTY_EXPIRING_SOON',
        name: 'Warranty Expiring Soon',
        description: 'Warranty expiring within 30 days - customer follow-up needed',
        department: 'WARRANTY',
        enabled: true,
        cooldownDays: 14,
        evaluate: this.evaluateWarrantyExpiring.bind(this),
      },

      // FINANCE RULES
      {
        key: 'FINANCE_LOW_MARGIN_HIGH_RISK_JOB',
        name: 'Finance Low Margin + High Risk Job',
        description: 'Job has low profitability and high risk - management attention needed',
        department: 'FINANCE',
        enabled: true,
        cooldownDays: 7,
        evaluate: this.evaluateFinanceLowMarginHighRisk.bind(this),
      },
      {
        key: 'FINANCE_MISSING_CONTRACT_AMOUNT',
        name: 'Finance Missing Contract Amount',
        description: 'Job is in progress but has no contract amount recorded',
        department: 'FINANCE',
        enabled: true,
        cooldownDays: 5,
        evaluate: this.evaluateFinanceMissingContract.bind(this),
      },
      {
        key: 'FINANCE_AR_OVERDUE_PAYMENT_REMINDER',
        name: 'Finance AR Overdue Payment Reminder',
        description: 'Send automated payment reminder for overdue invoices (7+ days overdue)',
        department: 'FINANCE',
        enabled: true,
        cooldownDays: 7,
        evaluate: this.evaluateArOverduePaymentReminder.bind(this),
      },
    ];

    this.logger.log(`Initialized ${this.rules.length} workflow rules`);
  }

  /**
   * Get all rule summaries
   */
  getRuleSummaries(): WorkflowRuleSummaryDTO[] {
    return this.rules.map((rule) => ({
      key: rule.key,
      name: rule.name,
      description: rule.description,
      department: rule.department,
      enabled: rule.enabled,
    }));
  }

  /**
   * Check if a rule has fired recently for a job (dedup logic)
   */
  private async hasRecentAction(
    jobId: string,
    ruleKey: string,
    cooldownDays: number
  ): Promise<boolean> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cooldownDays);

    const recentAction = await prisma.workflowActionLog.findFirst({
      where: {
        jobId,
        ruleKey,
        createdAt: { gte: cutoffDate },
      },
    });

    return !!recentAction;
  }

  /**
   * Create a workflow action log
   */
  private async createActionLog(
    jobId: string,
    ruleKey: string,
    actionType: WorkflowActionType,
    metadata?: Record<string, unknown>
  ): Promise<WorkflowActionLogDTO> {
    const log = await prisma.workflowActionLog.create({
      data: {
        jobId,
        ruleKey,
        actionType,
        metadataJson: metadata as any,
      },
    });

    return {
      id: log.id,
      jobId: log.jobId,
      ruleKey: log.ruleKey,
      actionType: log.actionType as WorkflowActionType,
      createdAt: log.createdAt.toISOString(),
      metadata: log.metadataJson as Record<string, unknown> | null,
    };
  }

  /**
   * Create a JobNimbus task
   */
  private async createJobNimbusTask(
    jobNimbusId: string,
    title: string,
    description: string,
    dueInDays: number = 3
  ): Promise<void> {
    if (!this.jobNimbusClient) {
      this.logger.warn('Cannot create JobNimbus task - client not initialized');
      return;
    }

    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueInDays);

      await this.jobNimbusClient.createTask(jobNimbusId, {
        title,
        dueDate: dueDate.toISOString().split('T')[0],
      });

      this.logger.debug(`Created JobNimbus task for ${jobNimbusId}: ${title}`);
    } catch (error) {
      this.logger.error(
        `Failed to create JobNimbus task: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - continue with workflow
    }
  }

  /**
   * Create a JobNimbus note
   */
  private async createJobNimbusNote(jobNimbusId: string, text: string): Promise<void> {
    if (!this.jobNimbusClient) {
      this.logger.warn('Cannot create JobNimbus note - client not initialized');
      return;
    }

    try {
      await this.jobNimbusClient.createNote(jobNimbusId, { text });
      this.logger.debug(`Created JobNimbus note for ${jobNimbusId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create JobNimbus note: ${error instanceof Error ? error.message : String(error)}`
      );
      // Don't throw - continue with workflow
    }
  }

  // ============================================================================
  // RULE EVALUATION METHODS
  // ============================================================================

  /**
   * SALES: Estimate follow-up after 72h with no activity
   */
  private async evaluateSalesEstimateFollowup(jobId: string): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Check if job is in an "estimate sent" type status
    const estimateStatuses = ['QUALIFIED', 'DESIGN', 'SITE_SURVEY'];
    if (!estimateStatuses.includes(job.status)) return null;

    // Check if no update for >= 72 hours
    const hoursSinceUpdate = (Date.now() - job.updatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceUpdate < 72) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'SALES_ESTIMATE_FOLLOWUP_72H', 7)) {
      return null;
    }

    // Create task
    await this.createJobNimbusTask(
      job.jobNimbusId,
      '📞 Sales Follow-up Needed',
      `This estimate has had no activity for ${Math.floor(hoursSinceUpdate)} hours. Please follow up with customer.`,
      2
    );

    // Log action
    return this.createActionLog(jobId, 'SALES_ESTIMATE_FOLLOWUP_72H', 'JOBNIMBUS_TASK', {
      hoursSinceUpdate: Math.floor(hoursSinceUpdate),
      status: job.status,
    });
  }

  /**
   * PRODUCTION: QC failed due to missing photos
   */
  private async evaluateProductionQcFailPhotos(
    jobId: string
  ): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Get latest QC check
    const qcCheck = await prisma.qCPhotoCheck.findFirst({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });

    if (!qcCheck || qcCheck.status !== 'FAIL') return null;

    // Parse missing categories
    const missingCategories = JSON.parse(qcCheck.missingCategoriesJson || '[]');
    if (missingCategories.length === 0) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'PRODUCTION_QC_FAIL_NEEDS_PHOTOS', 3)) {
      return null;
    }

    const categoryList = missingCategories
      .map((m: any) => `${m.category}: needs ${m.required}, has ${m.actual}`)
      .join(', ');

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '📸 QC Failed - Photos Needed',
      `QC check failed. Missing required photos: ${categoryList}. Please upload photos and re-run QC.`,
      2
    );

    return this.createActionLog(jobId, 'PRODUCTION_QC_FAIL_NEEDS_PHOTOS', 'JOBNIMBUS_TASK', {
      missingCategories,
      qcStatus: qcCheck.status,
    });
  }

  /**
   * PRODUCTION: Material delay affecting schedule
   */
  private async evaluateProductionMaterialDelay(
    jobId: string
  ): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Find late material orders
    const now = new Date();
    const lateMaterials = await prisma.materialOrder.findMany({
      where: {
        jobId,
        status: { in: ['ORDERED', 'SHIPPED'] },
        expectedDeliveryDate: { lt: now },
        actualDeliveryDate: null,
      },
    });

    if (lateMaterials.length === 0) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'PRODUCTION_MATERIAL_DELAY', 2)) {
      return null;
    }

    const materialList = lateMaterials
      .map((m) => `${m.materialName} (${m.supplierName})`)
      .join(', ');

    await this.createJobNimbusNote(
      job.jobNimbusId,
      `⚠️ MATERIAL DELAY: The following materials are overdue: ${materialList}. Consider rescheduling installation.`
    );

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '📦 Material Delay - Schedule Review',
      `Late materials: ${materialList}. Review schedule and coordinate with supplier.`,
      1
    );

    return this.createActionLog(jobId, 'PRODUCTION_MATERIAL_DELAY', 'JOBNIMBUS_TASK', {
      lateMaterialCount: lateMaterials.length,
      materials: lateMaterials.map((m) => ({ name: m.materialName, supplier: m.supplierName })),
    });
  }

  /**
   * ADMIN: Non-compliant subcontractor assigned
   */
  private async evaluateAdminSubNoncompliant(jobId: string): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Get assigned subcontractors
    const assignments = await prisma.jobSubcontractorAssignment.findMany({
      where: { jobId, unassignedAt: null },
      include: { subcontractor: true },
    });

    // Find non-compliant ones
    const nonCompliant = assignments.filter((a) => {
      const sub = a.subcontractor;
      const now = new Date();

      // Check compliance criteria
      const licenseValid = sub.licenseExpiresAt && sub.licenseExpiresAt > now;
      const insuranceValid = sub.insuranceExpiresAt && sub.insuranceExpiresAt > now;
      const w9Received = sub.w9Received;
      const coiReceived = sub.coiReceived;

      return !(licenseValid && insuranceValid && w9Received && coiReceived);
    });

    if (nonCompliant.length === 0) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'ADMIN_SUB_NONCOMPLIANT_ASSIGNED', 1)) {
      return null;
    }

    const subNames = nonCompliant.map((a) => a.subcontractor.name).join(', ');

    await this.createJobNimbusNote(
      job.jobNimbusId,
      `🚨 COMPLIANCE ALERT: Non-compliant subcontractor(s) assigned: ${subNames}. Verify credentials before work begins.`
    );

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '⚠️ Compliance Issue - Subcontractor',
      `Non-compliant subcontractor assigned: ${subNames}. Review credentials immediately.`,
      0
    );

    return this.createActionLog(jobId, 'ADMIN_SUB_NONCOMPLIANT_ASSIGNED', 'JOBNIMBUS_TASK', {
      nonCompliantSubcontractors: nonCompliant.map((a) => ({
        id: a.subcontractorId,
        name: a.subcontractor.name,
      })),
    });
  }

  /**
   * SAFETY: Open high severity incident
   */
  private async evaluateSafetyHighSeverityIncident(
    jobId: string
  ): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Find open high/critical severity incidents
    const openIncidents = await prisma.safetyIncident.findMany({
      where: {
        jobId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
        severity: { in: ['HIGH', 'CRITICAL'] },
      },
      orderBy: { occurredAt: 'desc' },
    });

    if (openIncidents.length === 0) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'SAFETY_OPEN_HIGH_SEVERITY_INCIDENT', 1)) {
      return null;
    }

    // TypeScript needs explicit check even though we checked length above
    const highestIncident = openIncidents[0]!;
    const incidentSummary = openIncidents
      .map((i) => `${i.severity}: ${i.type} (${i.occurredAt.toLocaleDateString()})`)
      .join('; ');

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '🚨 Safety Follow-up Required',
      `Open ${highestIncident.severity} severity incidents: ${incidentSummary}. Immediate safety review required.`,
      0
    );

    return this.createActionLog(jobId, 'SAFETY_OPEN_HIGH_SEVERITY_INCIDENT', 'JOBNIMBUS_TASK', {
      incidentCount: openIncidents.length,
      highestSeverity: highestIncident.severity,
      incidentTypes: openIncidents.map((i) => i.type),
    });
  }

  /**
   * WARRANTY: Warranty expiring soon
   */
  private async evaluateWarrantyExpiring(jobId: string): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Get warranty
    const warranty = await prisma.warranty.findUnique({
      where: { jobId, status: 'ACTIVE' },
    });

    if (!warranty) return null;

    // Check if expiring within 30 days
    const daysUntilExpiry = Math.floor(
      (warranty.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry > 30 || daysUntilExpiry < 0) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'WARRANTY_EXPIRING_SOON', 14)) {
      return null;
    }

    await this.createJobNimbusNote(
      job.jobNimbusId,
      `⏰ Warranty expiring in ${daysUntilExpiry} days (${warranty.endDate.toLocaleDateString()}). Consider customer follow-up or upsell opportunity.`
    );

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '📅 Warranty Expiring - Customer Follow-up',
      `Warranty expires in ${daysUntilExpiry} days. Follow up with customer for extension or upsell.`,
      7
    );

    return this.createActionLog(jobId, 'WARRANTY_EXPIRING_SOON', 'JOBNIMBUS_TASK', {
      daysUntilExpiry,
      warrantyEndDate: warranty.endDate.toISOString(),
      warrantyType: warranty.type,
    });
  }

  /**
   * FINANCE: Low margin + high risk job
   */
  private async evaluateFinanceLowMarginHighRisk(
    jobId: string
  ): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Get financial snapshot
    const financial = await prisma.jobFinancialSnapshot.findUnique({
      where: { jobId },
    });

    if (!financial) return null;

    // Check if low margin (< 10%)
    const isLowMargin = financial.marginPercent !== null && financial.marginPercent < 10;

    // Get risk snapshot
    const risk = await prisma.jobRiskSnapshot.findUnique({
      where: { jobId },
    });

    const isHighRisk = risk?.riskLevel === 'HIGH';

    if (!isLowMargin || !isHighRisk) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'FINANCE_LOW_MARGIN_HIGH_RISK_JOB', 7)) {
      return null;
    }

    await this.createJobNimbusNote(
      job.jobNimbusId,
      `💰 FINANCE ALERT: Low margin (${financial.marginPercent?.toFixed(1)}%) + HIGH risk job. Management review recommended.`
    );

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '⚠️ Finance Review - Low Margin High Risk',
      `Job has ${financial.marginPercent?.toFixed(1)}% margin and HIGH risk. Review for cost overruns or mitigation.`,
      3
    );

    return this.createActionLog(jobId, 'FINANCE_LOW_MARGIN_HIGH_RISK_JOB', 'JOBNIMBUS_NOTE', {
      marginPercent: financial.marginPercent,
      marginAmount: financial.marginAmount,
      riskLevel: risk.riskLevel,
    });
  }

  /**
   * FINANCE: Missing contract amount
   */
  private async evaluateFinanceMissingContract(
    jobId: string
  ): Promise<WorkflowActionLogDTO | null> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || !job.jobNimbusId) return null;

    // Only check for jobs that should have a contract (in progress or later)
    const requiresContract = [
      'APPROVED',
      'SCHEDULED',
      'IN_PROGRESS',
      'INSPECTION',
      'COMPLETE',
    ].includes(job.status);

    if (!requiresContract) return null;

    // Check for financial snapshot
    const financial = await prisma.jobFinancialSnapshot.findUnique({
      where: { jobId },
    });

    // If no financial record or contract amount is 0 or source is PLACEHOLDER
    const hasMissingContract =
      !financial || financial.contractAmount === 0 || financial.accountingSource === 'PLACEHOLDER';

    if (!hasMissingContract) return null;

    // Check dedup
    if (await this.hasRecentAction(jobId, 'FINANCE_MISSING_CONTRACT_AMOUNT', 5)) {
      return null;
    }

    await this.createJobNimbusTask(
      job.jobNimbusId,
      '📄 Missing Contract Amount',
      `Job is ${job.status} but has no contract amount recorded. Please update QuickBooks or enter manually.`,
      2
    );

    return this.createActionLog(jobId, 'FINANCE_MISSING_CONTRACT_AMOUNT', 'JOBNIMBUS_TASK', {
      status: job.status,
      accountingSource: financial?.accountingSource || null,
    });
  }

  /**
   * FINANCE: AR overdue payment reminder (Phase 5 Sprint 2)
   */
  private async evaluateArOverduePaymentReminder(
    jobId: string
  ): Promise<WorkflowActionLogDTO | null> {
    const MIN_DAYS_OVERDUE = 7; // Only send reminders for invoices at least 7 days overdue

    // Get job and financial snapshot
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        financialSnapshot: true,
      },
    });

    if (!job || !job.jobNimbusId) return null;

    const financial = job.financialSnapshot;
    if (!financial) return null;

    // Check if job has overdue AR
    if (financial.arStatus !== 'OVERDUE') return null;
    if (!financial.amountOutstanding || financial.amountOutstanding <= 0) return null;
    if (!financial.invoiceDueDate) return null;

    // Check if at least MIN_DAYS_OVERDUE days overdue
    const daysOverdue = differenceInCalendarDays(new Date(), financial.invoiceDueDate);
    if (daysOverdue < MIN_DAYS_OVERDUE) return null;

    // Check dedup (cooldown)
    if (await this.hasRecentAction(jobId, 'FINANCE_AR_OVERDUE_PAYMENT_REMINDER', 7)) {
      return null;
    }

    this.logger.log(
      `AR payment reminder triggered for job ${jobId}: $${financial.amountOutstanding} overdue by ${daysOverdue} days`
    );

    // Format currency
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

    const outstandingFormatted = formatCurrency(financial.amountOutstanding);

    // Create templated payment reminder email via CX Engine
    const reminderTitle = 'Friendly reminder about your outstanding balance';
    const reminderBody = `Hi${job.customerName ? ' ' + job.customerName : ''},

We hope your solar installation project is going well! This is a friendly reminder that we have an outstanding balance on your account.

**Outstanding Amount:** ${outstandingFormatted}
**Invoice Due Date:** ${financial.invoiceDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

If you've already sent payment, please disregard this message. Otherwise, please contact our office at your earliest convenience to arrange payment.

Thank you for choosing us for your solar energy needs!

Best regards,
Your Green Energy Team

---
*Questions? Reply to this email or give us a call.*`;

    try {
      // Create CX message with EMAIL channel and sendEmail=true
      await this.customerExperienceService.createMessageForJob(jobId, {
        type: 'PAYMENT_REMINDER',
        channel: 'EMAIL',
        source: 'SYSTEM',
        title: reminderTitle,
        body: reminderBody,
        sendEmail: true,
      });

      this.logger.log(`Payment reminder email sent for job ${jobId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminder email for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
      );
      // Continue with JobNimbus task even if email fails
    }

    // Optionally send SMS if enabled (Phase 7 Sprint 1)
    const enablePaymentReminderSms = this.configService.get<string>('ENABLE_PAYMENT_REMINDER_SMS', 'false').toLowerCase() === 'true';

    if (enablePaymentReminderSms) {
      try {
        // Build concise SMS body
        const smsBody = `Payment reminder: You have an outstanding balance of ${outstandingFormatted} (${daysOverdue} days overdue). Please contact us to arrange payment. - Green Energy Solar`;

        await this.customerExperienceService.createMessageForJob(jobId, {
          type: 'PAYMENT_REMINDER',
          channel: 'SMS',
          source: 'SYSTEM',
          title: 'Payment Reminder',
          body: smsBody,
          sendSms: true,
        });

        this.logger.log(`Payment reminder SMS sent for job ${jobId}`);
      } catch (error) {
        this.logger.error(
          `Failed to send payment reminder SMS for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue - don't fail the entire workflow if SMS fails
      }
    }

    // Also create JobNimbus internal task for follow-up
    await this.createJobNimbusTask(
      job.jobNimbusId,
      '💰 Follow up on overdue payment',
      `Outstanding balance: ${outstandingFormatted}, ${daysOverdue} days overdue. Automated reminder sent to customer. Follow up if no response within 3 days.`,
      3
    );

    return this.createActionLog(jobId, 'FINANCE_AR_OVERDUE_PAYMENT_REMINDER', 'JOBNIMBUS_TASK', {
      amountOutstanding: financial.amountOutstanding,
      daysOverdue,
      invoiceDueDate: financial.invoiceDueDate.toISOString(),
    });
  }

  // ============================================================================
  // EXECUTION METHODS
  // ============================================================================

  /**
   * Run all enabled rules for a single job
   */
  async runForJob(jobId: string): Promise<WorkflowActionLogDTO[]> {
    this.logger.log(`Running workflow rules for job: ${jobId}`);

    const actions: WorkflowActionLogDTO[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const action = await rule.evaluate(jobId);
        if (action) {
          actions.push(action);
          this.logger.log(`Rule ${rule.key} triggered for job ${jobId}: ${rule.name}`);
        }
      } catch (error) {
        this.logger.error(
          `Rule ${rule.key} failed for job ${jobId}: ${error instanceof Error ? error.message : String(error)}`
        );
        // Continue with other rules
      }
    }

    return actions;
  }

  /**
   * Run all enabled rules for all active jobs
   */
  async runForAllActiveJobs(limit: number = 500): Promise<{ processed: number; actions: number }> {
    this.logger.log(`Running workflow rules for all active jobs (limit: ${limit})`);

    // Find active jobs (not cancelled or complete)
    const jobs = await prisma.job.findMany({
      where: {
        status: {
          notIn: ['CANCELLED', 'COMPLETE'],
        },
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    this.logger.log(`Found ${jobs.length} active jobs to process`);

    let totalActions = 0;

    for (const job of jobs) {
      const actions = await this.runForJob(job.id);
      totalActions += actions.length;
    }

    this.logger.log(
      `Workflow execution complete: processed ${jobs.length} jobs, ${totalActions} actions taken`
    );

    return {
      processed: jobs.length,
      actions: totalActions,
    };
  }

  /**
   * Get recent workflow action logs
   */
  async getRecentLogs(params: {
    jobId?: string;
    ruleKey?: string;
    limit?: number;
  }): Promise<WorkflowActionLogDTO[]> {
    const { jobId, ruleKey, limit = 50 } = params;

    const where: any = {};
    if (jobId) where.jobId = jobId;
    if (ruleKey) where.ruleKey = ruleKey;

    const logs = await prisma.workflowActionLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      jobId: log.jobId,
      ruleKey: log.ruleKey,
      actionType: log.actionType as WorkflowActionType,
      createdAt: log.createdAt.toISOString(),
      metadata: log.metadataJson as Record<string, unknown> | null,
    }));
  }
}
