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
export type WarrantyStatus =
  | 'PENDING_ACTIVATION'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED';

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

export type WarrantyClaimStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESOLVED';

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
