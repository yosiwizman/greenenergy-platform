// Domain enums
export enum JobStatus {
  LEAD = 'LEAD',
  QUALIFIED = 'QUALIFIED',
  SITE_SURVEY = 'SITE_SURVEY',
  DESIGN = 'DESIGN',
  PERMITTING = 'PERMITTING',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  INSPECTION = 'INSPECTION',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED',
}

export enum QCStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  REQUIRES_ATTENTION = 'REQUIRES_ATTENTION',
}

export enum RiskLevel {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// WarrantyStatus moved to Phase 2 Sprint 3 section below (now a type union, not enum)

export enum SubcontractorScoreTier {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  UNRATED = 'UNRATED',
}

// Material Order Types (Phase 2 Sprint 4)
export type MaterialOrderStatus =
  | 'PENDING'
  | 'ORDERED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'DELAYED'
  | 'CANCELLED';

export type MaterialEtaStatus = 'ON_TRACK' | 'AT_RISK' | 'LATE';

// Legacy enum for backward compatibility
export enum MaterialETAStatus {
  ORDERED = 'ORDERED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELAYED = 'DELAYED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

// Domain interfaces
export interface Job {
  id: string;
  jobNimbusId?: string;
  customerName: string;
  address: string;
  status: JobStatus;
  assignedTo?: string;
  startDate?: Date;
  completionDate?: Date;
  systemSize?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  jobNimbusId?: string;
  jobId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSyncLog {
  id: string;
  jobId: string;
  syncType: 'PULL' | 'PUSH';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  recordsAffected: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface PhotoMetadata {
  id: string;
  jobId: string;
  jobNimbusAttachmentId?: string;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
  category?: string;
  qcStatus?: QCStatus;
  qcNotes?: string;
}

export interface QCResult {
  id: string;
  jobId: string;
  photoId?: string;
  checklistItem: string;
  status: QCStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface RiskFlag {
  id: string;
  jobId: string;
  riskLevel: RiskLevel;
  category: string;
  description: string;
  detectedBy: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface CustomerUser {
  id: string;
  jobId: string;
  email: string;
  name: string;
  magicLinkToken?: string;
  tokenExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface Subcontractor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialties: string[];
  scoreTier: SubcontractorScoreTier;
  averageScore?: number;
  totalJobsCompleted: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafetyIncident {
  id: string;
  jobId: string;
  subcontractorId?: string;
  incidentDate: Date;
  severity: 'MINOR' | 'MODERATE' | 'SEVERE';
  description: string;
  reportedBy: string;
  resolvedAt?: Date;
  createdAt: Date;
}

// Warranty System Types (Phase 2 Sprint 3) - replaced old interface
export type WarrantyStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface WarrantyDTO {
  id: string;
  jobId: string;
  warrantyNumber?: string;
  type: string;
  provider?: string;
  startDate: string;
  endDate: string;
  status: WarrantyStatus;
  coverageSummary?: string; // derived from coverageJson
  documentUrl?: string;
  activatedAt?: string;
}

export type WarrantyClaimStatus = 'OPEN' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';

export type WarrantyClaimPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface WarrantyClaimDTO {
  id: string;
  jobId: string;
  warrantyId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  source: 'PORTAL' | 'INTERNAL';
  status: WarrantyClaimStatus;
  priority: WarrantyClaimPriority;
  title: string;
  description: string;
  reportedAt: string;
  resolvedAt?: string;
}

export interface WarrantySummaryDTO {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}

// Legacy interface for backward compatibility
export interface Warranty {
  id: string;
  jobId: string;
  warrantyType: string;
  provider: string;
  startDate: Date;
  endDate: Date;
  status: string;
  claimDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialOrderDTO {
  id: string;
  jobId: string;
  supplierName: string;
  orderNumber?: string | null;
  materialName: string;
  quantity?: number | null;
  unit?: string | null;
  status: MaterialOrderStatus;
  orderedAt?: string | null;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  trackingUrl?: string | null;
  notes?: string | null;
  etaStatus: MaterialEtaStatus;
}

export interface MaterialSummaryDTO {
  totalOrders: number;
  openOrders: number;
  delayedOrders: number;
  deliveredOrders: number;
}

export interface CreateMaterialOrderDto {
  supplierName: string;
  materialName: string;
  quantity?: number;
  unit?: string;
  orderNumber?: string;
  expectedDeliveryDate?: string;
  trackingUrl?: string;
  notes?: string;
}

export interface UpdateMaterialOrderDto {
  status?: MaterialOrderStatus;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  trackingUrl?: string;
  notes?: string;
  supplierName?: string;
  materialName?: string;
  quantity?: number;
  unit?: string;
}

// Legacy interface for backward compatibility
export interface MaterialOrder {
  id: string;
  jobId: string;
  supplier: string;
  orderNumber: string;
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  etaStatus: MaterialETAStatus;
  items: string;
  totalCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt: Date;
}

// DTOs for API
export interface CreateJobDto {
  customerName: string;
  address: string;
  status?: JobStatus;
  assignedTo?: string;
  systemSize?: number;
}

export interface UpdateJobDto {
  customerName?: string;
  address?: string;
  status?: JobStatus;
  assignedTo?: string;
  startDate?: Date;
  completionDate?: Date;
  systemSize?: number;
}

export interface CreateNoteDto {
  jobId: string;
  content: string;
  createdBy: string;
}

export interface CreateTaskDto {
  jobId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  assignedTo?: string;
}

// Customer Portal Types
export type PortalPhotoCategory = 'BEFORE' | 'DURING' | 'AFTER';

export interface PortalJobPhoto {
  id: string;
  category: PortalPhotoCategory;
  url: string;
  caption?: string;
  takenAt?: string; // ISO string
}

export type PortalDocumentType = 'CONTRACT' | 'PERMIT' | 'WARRANTY' | 'OTHER';

export interface PortalJobDocument {
  id: string;
  type: PortalDocumentType;
  name: string;
  url: string;
  uploadedAt?: string;
}

export type PortalStatusStepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface PortalJobStatusStep {
  id: string;
  label: string;
  description?: string;
  order: number;
  status: PortalStatusStepStatus;
  completedAt?: string;
}

export interface PortalJobView {
  jobId: string;
  jobNumber?: string;
  customerName: string;
  propertyAddress?: string;
  currentStatus: string;
  statusTimeline: PortalJobStatusStep[];
  lastUpdatedAt?: string;
  photos: PortalJobPhoto[];
  documents: PortalJobDocument[];
  warranty?: WarrantyDTO | null;
}

export interface CreatePortalSessionDto {
  jobId: string;
  email: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface ResolvePortalSessionResponse {
  jobId: string;
  jobView: PortalJobView;
}

// Photo & QC Types
export type PhotoCategory = 'BEFORE' | 'DURING' | 'AFTER';
export type PhotoSource = 'JOBNIMBUS' | 'MANUAL';

export interface PhotoMetadataDTO {
  id: string;
  jobId: string;
  category: PhotoCategory;
  url: string;
  filename?: string;
  caption?: string;
  takenAt?: string; // ISO
  uploadedAt: string; // ISO
  source: PhotoSource;
}

export type QCCheckStatus = 'PASS' | 'FAIL' | 'NOT_CHECKED';

export interface QCRuleRequirement {
  category: PhotoCategory;
  requiredCount: number;
}

export interface QCMissingCategory {
  category: PhotoCategory;
  requiredCount: number;
  actualCount: number;
}

export interface QCCheckResult {
  jobId: string;
  status: QCCheckStatus;
  checkedAt: string; // ISO
  missingCategories: QCMissingCategory[];
  totalPhotosByCategory: Record<PhotoCategory, number>;
  jobNimbusSyncedAt?: string; // ISO, present if synced back to JobNimbus
}

export interface JobQCOverview {
  jobId: string;
  jobName?: string;
  qcStatus: QCCheckStatus;
  totalPhotos: number;
  beforeCount: number;
  duringCount: number;
  afterCount: number;
  lastCheckedAt?: string;
}

export interface SyncPhotosSummary {
  totalJobs: number;
  photosInserted: number;
  photosUpdated: number;
  photosUnchanged: number;
  errors: string[];
}

// Risk Dashboard Types (Sprint 5)
export type RiskReasonCode =
  | 'STUCK_IN_STATUS'
  | 'MISSING_QC_PHOTOS'
  | 'MISSING_DOCUMENTS'
  | 'STALE_JOB'
  | 'SAFETY_INCIDENT'
  | 'CUSTOM';

export interface RiskReason {
  code: RiskReasonCode;
  label: string; // Short human-readable label
  description?: string; // Optional longer description
  severity: 'LOW' | 'MEDIUM' | 'HIGH'; // Severity for this reason
}

export interface JobRiskSnapshotDTO {
  jobId: string;
  jobNumber?: string;
  customerName?: string;
  currentStatus?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: RiskReason[];
  lastUpdatedAt?: string; // Job last update
  riskComputedAt: string; // When this snapshot was computed
  jobNimbusUrl?: string; // Deep link to JobNimbus
}

// Embedded Panel Types (Sprint 6)
export type EmbeddedPanelType = 'QC_PANEL' | 'RISK_VIEW' | 'CUSTOMER_PORTAL_VIEW';

export interface EmbedSessionPayload {
  jobId: string;
  panelType: EmbeddedPanelType;
  exp: number; // unix timestamp seconds for expiry
}

export interface EmbedLinkResponse {
  url: string;
  panelType: EmbeddedPanelType;
  jobId: string;
  expiresAt: string; // ISO
}

// Subcontractor Management Types (Phase 2 Sprint 1)
export type SubcontractorPerformanceStatus = 'GREEN' | 'YELLOW' | 'RED';

export type SubcontractorComplianceStatusType = 'COMPLIANT' | 'NON_COMPLIANT';

export interface SubcontractorDTO {
  id: string;
  name: string;
  legalName?: string;
  primaryContact?: string;
  phone?: string;
  email?: string;
  crewSize?: number;
  licenseNumber?: string;
  licenseExpiresAt?: string;
  insurancePolicyNumber?: string;
  insuranceExpiresAt?: string;
  w9Received: boolean;
  coiReceived: boolean;
  isActive: boolean;
  performanceScore?: number; // 0-100
  performanceStatus?: SubcontractorPerformanceStatus;
  lastEvaluatedAt?: string;
  lastComplianceStatus?: SubcontractorComplianceStatusType;
  specialties?: string[];
  totalJobsCompleted?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubcontractorDto {
  name: string;
  legalName?: string;
  primaryContact?: string;
  phone?: string;
  email?: string;
  crewSize?: number;
  licenseNumber?: string;
  licenseExpiresAt?: string;
  insurancePolicyNumber?: string;
  insuranceExpiresAt?: string;
  w9Received?: boolean;
  coiReceived?: boolean;
  specialties?: string[];
}

export interface UpdateSubcontractorDto {
  name?: string;
  legalName?: string;
  primaryContact?: string;
  phone?: string;
  email?: string;
  crewSize?: number;
  licenseNumber?: string;
  licenseExpiresAt?: string;
  insurancePolicyNumber?: string;
  insuranceExpiresAt?: string;
  w9Received?: boolean;
  coiReceived?: boolean;
  specialties?: string[];
  isActive?: boolean;
}

export interface SubcontractorComplianceStatus {
  hasValidLicense: boolean;
  hasValidInsurance: boolean;
  hasW9: boolean;
  hasCOI: boolean;
  isCompliant: boolean;
  missingItems: string[]; // e.g. ['INSURANCE_EXPIRED', 'W9_MISSING']
}

export interface SubcontractorPerformanceInput {
  subcontractorId: string;
  qcFailureCount: number;
  inspectionFailureCount: number;
  delayIncidentsCount: number;
  customerComplaintsCount: number;
  safetyIncidentsCount: number;
}

export interface SubcontractorPerformanceFactor {
  label: string;
  value: number;
  weight: number;
  impact: 'POSITIVE' | 'NEGATIVE';
}

export interface SubcontractorPerformanceSummary {
  subcontractorId: string;
  score: number; // 0-100
  status: SubcontractorPerformanceStatus;
  factors: SubcontractorPerformanceFactor[];
  evaluatedAt: string;
}

export interface JobSubcontractorAssignmentDTO {
  id: string;
  jobId: string;
  subcontractorId: string;
  subcontractorName: string;
  role?: string;
  assignedAt: string;
  unassignedAt?: string;
  isPrimary: boolean;
}

export interface AssignSubcontractorDto {
  subcontractorId: string;
  role?: string;
  isPrimary?: boolean;
}

// Safety & Incident Reporting Types (Phase 2 Sprint 2)
export type SafetyIncidentType =
  | 'INJURY'
  | 'PROPERTY_DAMAGE'
  | 'NEAR_MISS'
  | 'VIOLATION'
  | 'CREW_ISSUE';

export type SafetyIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SafetyIncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';

export interface SafetyIncidentDTO {
  id: string;
  jobId?: string;
  jobNumber?: string;
  subcontractorId?: string;
  subcontractorName?: string;
  type: SafetyIncidentType;
  severity: SafetyIncidentSeverity;
  description: string;
  occurredAt: string;
  reportedAt: string;
  reportedBy?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status: SafetyIncidentStatus;
  lostTimeDays?: number;
  medicalTreatmentRequired?: boolean;
  photos: {
    id: string;
    url: string;
    caption?: string;
    uploadedAt: string;
  }[];
}

export interface CreateSafetyIncidentDto {
  jobId?: string;
  subcontractorId?: string;
  type: SafetyIncidentType;
  severity: SafetyIncidentSeverity;
  description: string;
  occurredAt: string;
  reportedBy?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status?: SafetyIncidentStatus;
  lostTimeDays?: number;
  medicalTreatmentRequired?: boolean;
  photos?: {
    url: string;
    caption?: string;
  }[];
}

export interface UpdateSafetyIncidentStatusDto {
  status: SafetyIncidentStatus;
}

export type SafetyChecklistType =
  | 'TOOLBOX_TALK'
  | 'PPE'
  | 'LADDER'
  | 'FALL_PROTECTION'
  | 'HEAT_EXPOSURE'
  | 'ELECTRICAL';

export interface SafetyChecklistItemResult {
  label: string;
  value: 'OK' | 'ISSUE' | 'NA';
  comment?: string;
}

export interface SafetyChecklistDTO {
  id: string;
  jobId?: string;
  subcontractorId?: string;
  type: SafetyChecklistType;
  date: string;
  completedBy?: string;
  notes?: string;
  items: SafetyChecklistItemResult[];
}

export interface CreateSafetyChecklistDto {
  jobId?: string;
  subcontractorId?: string;
  type: SafetyChecklistType;
  date: string;
  completedBy?: string;
  notes?: string;
  items: SafetyChecklistItemResult[];
}

export interface SafetyIncidentSummaryDTO {
  total: number;
  byType: Record<SafetyIncidentType, number>;
  bySeverity: Record<SafetyIncidentSeverity, number>;
  byStatus: Record<SafetyIncidentStatus, number>;
  incidentsLast30Days: number;
}

export interface OshalogSummaryDTO {
  year: number;
  totalRecordableIncidents: number;
  daysAwayFromWork: number;
  restrictedOrTransferCases: number;
  otherRecordableCases: number;
  byIncidentType: Record<SafetyIncidentType, number>;
}

// Scheduling & Predictive Planning Types (Phase 2 Sprint 4)
export type SchedulingRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface SchedulingRiskDTO {
  jobId: string;
  jobNumber?: string | null;
  customerName?: string | null;
  status: string; // job status
  materialEtaStatus: MaterialEtaStatus;
  hasHighRiskFlags: boolean; // from Risk service
  subcontractorName?: string | null;
  subcontractorStatus?: 'GREEN' | 'YELLOW' | 'RED' | null;
  schedulingRiskLevel: SchedulingRiskLevel;
  reasons: string[];
}

// AI Operations Assistant Types (Phase 2 Sprint 5)
export interface AiJobSummarySection {
  title: string;
  body: string;
}

export interface AiJobSummaryDTO {
  jobId: string;
  jobNumber?: string | null;
  customerName?: string | null;
  status: string;
  overallSummary: string;
  sections: AiJobSummarySection[];
}

export type AiRecommendationCategory =
  | 'QC'
  | 'RISK'
  | 'SAFETY'
  | 'MATERIALS'
  | 'SCHEDULING'
  | 'WARRANTY'
  | 'CUSTOMER'
  | 'GENERAL';

export type AiRecommendationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AiJobRecommendationDTO {
  id: string; // slug or stable ID
  label: string; // short title
  description: string; // 1-3 sentences
  category: AiRecommendationCategory;
  priority: AiRecommendationPriority;
}

export type AiCustomerMessageType = 'STATUS_UPDATE' | 'ETA_UPDATE' | 'GENERIC';

export interface AiCustomerMessageRequestDTO {
  type: AiCustomerMessageType;
  tone?: 'FRIENDLY' | 'FORMAL';
  customQuestion?: string; // for GENERIC type
}

export interface AiCustomerMessageDTO {
  jobId: string;
  type: AiCustomerMessageType;
  message: string;
}

// Profit & Executive Dashboard Types (Phase 2 Sprint 6)
export type JobProfitabilityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// Accounting Integration Types (Phase 3 Sprint 1)
export type AccountingSource = 'PLACEHOLDER' | 'QUICKBOOKS' | 'MANUAL';

// AR & Finance Types (Phase 5 Sprint 1)
export type JobArStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'OVERDUE';

export type PaymentMethod = 'CREDIT_CARD' | 'CHECK' | 'ACH' | 'WIRE' | 'OTHER';

export type PaymentStatus = 'APPLIED' | 'PENDING' | 'REVERSED';

export interface PaymentDTO {
  id: string;
  jobId: string;
  externalId: string;
  externalInvoiceId?: string | null;
  amount: number;
  receivedAt: string; // ISO string
  paymentMethod?: PaymentMethod | null;
  status: PaymentStatus;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface JobArDetailsDTO {
  jobId: string;
  jobNumber?: string | null;
  customerName?: string | null;
  status: string;
  contractAmount: number;
  amountPaid: number;
  amountOutstanding: number;
  arStatus: JobArStatus;
  lastPaymentAt?: string | null; // ISO string
  invoiceDueDate?: string | null; // ISO string
  payments: PaymentDTO[];
}

export interface ArSummaryDTO {
  totalOutstanding: number;
  totalPaid: number;
  totalContractValue: number;
  jobsPaid: number;
  jobsPartiallyPaid: number;
  jobsUnpaid: number;
  jobsOverdue: number;
}

// AR Aging Types (Phase 5 Sprint 2)
export enum ArAgingBucket {
  CURRENT = 'CURRENT',           // not yet due
  DAYS_1_30 = 'DAYS_1_30',       // 1-30 days overdue
  DAYS_31_60 = 'DAYS_31_60',     // 31-60 days overdue
  DAYS_61_90 = 'DAYS_61_90',     // 61-90 days overdue
  DAYS_91_PLUS = 'DAYS_91_PLUS', // 91+ days overdue
}

export interface ArAgingBucketData {
  bucket: ArAgingBucket;
  outstanding: number;
  jobsCount: number;
}

export interface ArAgingSummaryDTO {
  generatedAt: string; // ISO timestamp
  totalOutstanding: number;
  buckets: ArAgingBucketData[];
}

// Invoice Types (Phase 5 Sprint 3)
export interface InvoiceDTO {
  id: string;
  jobId: string;
  externalId: string;
  number?: string | null;
  dueDate?: string | null;       // ISO string
  totalAmount?: number | null;
  balance?: number | null;
  status?: string | null;
  publicUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceForJobInput {
  jobId: string;
  sendEmail?: boolean; // default true
}

export interface JobProfitabilityDTO {
  jobId: string;
  jobNumber?: string | null;
  customerName?: string | null;
  status: string;

  contractAmount: number;
  estimatedCost?: number | null;
  actualCost?: number | null;
  marginAmount?: number | null;
  marginPercent?: number | null;
  changeOrdersAmount?: number | null;

  profitabilityLevel: JobProfitabilityLevel;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  schedulingRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | null;

  // Accounting metadata (Phase 3 Sprint 1)
  accountingSource?: AccountingSource | null;
  accountingLastSyncAt?: string | null; // ISO string
}

export interface ProfitDashboardSummaryDTO {
  totalJobs: number;
  totalContractAmount: number;
  totalMarginAmount: number;
  averageMarginPercent: number | null;

  lowMarginJobCount: number;
  mediumMarginJobCount: number;
  highMarginJobCount: number;

  highRiskAndLowMarginJobCount: number;
}

export interface ProfitDashboardJobFilter {
  profitabilityLevel?: JobProfitabilityLevel;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Workflow Automation Types (Phase 3 Sprint 4)
export type WorkflowActionType = 'JOBNIMBUS_TASK' | 'JOBNIMBUS_NOTE' | 'INTERNAL_FLAG';

export type WorkflowDepartment =
  | 'SALES'
  | 'PRODUCTION'
  | 'ADMIN'
  | 'SAFETY'
  | 'WARRANTY'
  | 'FINANCE';

export interface WorkflowActionLogDTO {
  id: string;
  jobId: string;
  ruleKey: string;
  actionType: WorkflowActionType;
  createdAt: string; // ISO string
  metadata?: Record<string, unknown> | null;
}

export interface WorkflowRuleSummaryDTO {
  key: string;
  name: string;
  description: string;
  department: WorkflowDepartment;
  enabled: boolean;
}

export interface RunWorkflowForJobResponse {
  jobId: string;
  actions: WorkflowActionLogDTO[];
}

export interface RunAllWorkflowsResponse {
  processed: number;
  actions: number;
}

// Command Center Types (Phase 3 Sprint 6)
export interface CommandCenterSummaryDTO {
  jobsInProgress: number;
  jobsHighRisk: number;
  jobsAtRiskSchedule: number;
  openSafetyIncidents: number;
  subsGreen: number;
  subsYellow: number;
  subsRed: number;
  warrantiesExpiringSoon: number;
  materialOrdersDelayed: number;
  lowMarginHighRiskJobs: number;
  workflowActionsLast24h: number;
}

export interface CommandCenterJobAttentionDTO {
  jobId: string;
  customerName?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  hasQcFail?: boolean;
  hasOpenSafetyIncident?: boolean;
  hasDelayedMaterials?: boolean;
  hasExpiringWarranty?: boolean;
  isLowMarginHighRisk?: boolean;
  lastUpdatedAt?: string | null;
}

export interface CommandCenterRoleViewDTO {
  executive: {
    totalJobs: number;
    jobsInProgress: number;
    jobsHighRisk: number;
    avgMarginPercent?: number | null;
  };
  production: {
    jobsWithQcIssues: number;
    jobsWithDelayedMaterials: number;
    jobsWithSchedulingRisk: number;
  };
  safety: {
    openIncidents: number;
    highSeverityIncidents: number;
    incidentsLast30Days: number;
  };
  finance: {
    lowMarginJobs: number;
    lowMarginHighRiskJobs: number;
    totalContractAmount?: number | null;
  };
}

export interface CommandCenterOverviewDTO {
  summary: CommandCenterSummaryDTO;
  roleViews: CommandCenterRoleViewDTO;
  jobsNeedingAttention: CommandCenterJobAttentionDTO[];
}

// AI Dispatching & Field Optimization Types (Phase 3 Sprint 7)
export type DispatchRecommendationReason =
  | 'HIGH_PERFORMANCE_MATCH'
  | 'LOW_RISK_MATCH'
  | 'SERVICE_AREA_MATCH'
  | 'CAPACITY_AVAILABLE'
  | 'MATERIALS_NOT_READY'
  | 'WEATHER_RISK'
  | 'SCHEDULE_CONFLICT'
  | 'COMPLIANCE_ISSUE'
  | 'OTHER';

export type DispatchRecommendationConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface DispatchCrewOptionDTO {
  subcontractorId: string;
  subcontractorName: string;
  performanceStatus?: 'GREEN' | 'YELLOW' | 'RED';
  isCompliant: boolean;
  distanceKm?: number | null;
  openJobsToday?: number;
  maxConcurrentJobs?: number | null;
  reasons: DispatchRecommendationReason[];
  confidence: DispatchRecommendationConfidence;
}

export interface DispatchJobCandidateDTO {
  jobId: string;
  jobNumber?: string | null;
  customerName?: string | null;
  city?: string | null;
  status?: string | null;
  riskLevel?: string | null;
  scheduledDate?: string | null;
  estimatedSystemSizeKw?: number | null;
  materialsEtaStatus?: 'ON_TRACK' | 'AT_RISK' | 'LATE' | 'UNKNOWN';
  hasSafetyIssues?: boolean;
  hasQcIssues?: boolean;
}

export interface DispatchRecommendationDTO {
  job: DispatchJobCandidateDTO;
  recommendedSubcontractor?: DispatchCrewOptionDTO | null;
  alternatives: DispatchCrewOptionDTO[];
  scheduledDate: string;
  canStart: boolean;
  blockingReasons: DispatchRecommendationReason[];
}

export interface DispatchOverviewDTO {
  date: string;
  jobsTotal: number;
  jobsDispatchable: number;
  jobsBlocked: number;
  recommendations: DispatchRecommendationDTO[];
}

// Customer Experience Engine Types (Phase 4 Sprint 1)
export type CustomerMessageType = 'STATUS_UPDATE' | 'ETA_UPDATE' | 'GENERIC' | 'PAYMENT_REMINDER' | 'INVOICE_ISSUED';

export type CustomerMessageChannel = 'PORTAL' | 'EMAIL' | 'SMS';

export type CustomerMessageSource = 'SYSTEM' | 'HUMAN' | 'AI_SUGGESTED';

export interface CustomerMessageDTO {
  id: string;
  jobId: string;
  type: CustomerMessageType;
  channel: CustomerMessageChannel;
  source: CustomerMessageSource;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  metadataJson?: Record<string, unknown> | null;
}

export interface CreateCustomerMessageInput {
  type: CustomerMessageType;
  channel?: CustomerMessageChannel; // default PORTAL
  source?: CustomerMessageSource; // default HUMAN (for internal UI)
  title: string;
  body: string;
  metadataJson?: Record<string, unknown>;
  sendEmail?: boolean; // Phase 4 Sprint 2: trigger email sending (only for channel=EMAIL)
  sendSms?: boolean; // Phase 7 Sprint 1: trigger SMS sending (only for channel=SMS)
}

// Forecasting & Analytics Types (Phase 6 Sprint 1)
export interface CashflowPointDTO {
  date: string;           // ISO date (YYYY-MM-DD) representing the bucket (e.g., week ending)
  expectedInflow: number; // sum of amounts expected that date/bucket
  invoiceCount: number;
  overduePortion: number; // part of expectedInflow coming from overdue invoices/AR
}

export interface CashflowForecastDTO {
  generatedAt: string;        // ISO timestamp
  horizonWeeks: number;       // e.g., 12
  points: CashflowPointDTO[]; // ordered by date ascending
}

export interface PipelineBucketDTO {
  statusKey: string;         // internal status key
  statusLabel: string;       // human readable
  winProbability: number;    // 0–1
  jobsCount: number;
  totalAmount: number;
  weightedAmount: number;    // totalAmount * winProbability
}

export interface PipelineForecastDTO {
  generatedAt: string;
  totalPipelineAmount: number;
  totalWeightedAmount: number;
  buckets: PipelineBucketDTO[];
}

export interface ForecastOverviewDTO {
  generatedAt: string;
  cashflow: CashflowForecastDTO;
  pipeline: PipelineForecastDTO;
}

// Executive Weekly Digest Types (Phase 6 Sprint 2)
export interface ExecutiveDigestKeyCountsDTO {
  highRiskJobs: number;
  safetyIncidentsOpen: number;
  overdueArJobs: number;
  workflowsTriggeredLastPeriod: number;
}

export interface ExecutiveDigestDTO {
  generatedAt: string;   // ISO timestamp
  periodStart: string;   // ISO date (start of digest period, e.g., previous Monday)
  periodEnd: string;     // ISO date (end of digest period, e.g., Sunday)

  financeArSummary: ArSummaryDTO;
  financeAgingSummary: ArAgingSummaryDTO;
  forecastOverview: ForecastOverviewDTO;

  keyCounts: ExecutiveDigestKeyCountsDTO;
}

// Production Readiness & Observability Types (Phase 8 Sprint 1)
export type ExternalServiceStatus = 'UP' | 'DOWN' | 'DEGRADED';

export interface ExternalServiceHealthDTO {
  name: string;         // e.g., 'database', 'jobnimbus', 'quickbooks', 'email', 'sms'
  status: ExternalServiceStatus;
  lastCheckedAt: string; // ISO timestamp
  details?: string;
}

export interface CronJobStatusDTO {
  name: string;
  lastRunAt: string | null; // ISO timestamp or null if never run
}

export interface OpsStatusDTO {
  generatedAt: string;   // ISO timestamp
  coreApiHealthy: boolean;
  databaseHealthy: boolean;
  externalServices: ExternalServiceHealthDTO[];
  latestCronRuns: CronJobStatusDTO[];
}
