-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "jobNimbusId" TEXT,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "assignedTo" TEXT,
    "startDate" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "systemSize" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "jobNimbusId" TEXT,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_sync_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsAffected" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_metadata" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobNimbusAttachmentId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "qcStatus" TEXT,
    "qcNotes" TEXT,

    CONSTRAINT "photo_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "photoId" TEXT,
    "checklistItem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qc_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qc_photo_checks" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "missingCategoriesJson" TEXT NOT NULL,
    "totalPhotosJson" TEXT NOT NULL,
    "jobNimbusSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qc_photo_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_flags" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedBy" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,

    CONSTRAINT "risk_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_risk_snapshots" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "reasonsJson" TEXT NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3),
    "riskComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_risk_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_users" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "magicLinkToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "primaryContact" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "specialties" TEXT[],
    "crewSize" INTEGER,
    "licenseNumber" TEXT,
    "licenseExpiresAt" TIMESTAMP(3),
    "insurancePolicyNumber" TEXT,
    "insuranceExpiresAt" TIMESTAMP(3),
    "w9Received" BOOLEAN NOT NULL DEFAULT false,
    "coiReceived" BOOLEAN NOT NULL DEFAULT false,
    "lastComplianceStatus" TEXT,
    "performanceScore" INTEGER,
    "performanceStatus" TEXT,
    "lastEvaluatedAt" TIMESTAMP(3),
    "maxConcurrentJobs" INTEGER DEFAULT 1,
    "homeBaseCity" TEXT,
    "serviceRadiusKm" INTEGER DEFAULT 50,
    "preferredJobType" TEXT,
    "scoreTier" TEXT NOT NULL DEFAULT 'UNRATED',
    "averageScore" DOUBLE PRECISION,
    "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_incidents" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "subcontractorId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "lostTimeDays" INTEGER,
    "medicalTreatmentRequired" BOOLEAN,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_incident_photos" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_incident_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety_checklists" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "subcontractorId" TEXT,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completedBy" TEXT,
    "notes" TEXT,
    "itemsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "warrantyNumber" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "coverageJson" JSONB,
    "documentUrl" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "warrantyId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_orders" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "orderNumber" TEXT,
    "materialName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "status" TEXT NOT NULL,
    "orderedAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "trackingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcontractor_documents" (
    "id" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcontractor_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_subcontractor_assignments" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "role" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_subcontractor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_financial_snapshots" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "contractAmount" DOUBLE PRECISION NOT NULL,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "marginAmount" DOUBLE PRECISION,
    "marginPercent" DOUBLE PRECISION,
    "changeOrdersAmount" DOUBLE PRECISION,
    "riskLevel" TEXT,
    "schedulingRisk" TEXT,
    "accountingSource" TEXT,
    "accountingLastSyncAt" TIMESTAMP(3),
    "amountPaid" DOUBLE PRECISION DEFAULT 0,
    "amountOutstanding" DOUBLE PRECISION DEFAULT 0,
    "arStatus" TEXT,
    "lastPaymentAt" TIMESTAMP(3),
    "invoiceDueDate" TIMESTAMP(3),
    "primaryInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_financial_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_action_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_call_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feature" TEXT NOT NULL,
    "jobId" TEXT,
    "customerId" TEXT,
    "internalUserId" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "durationMs" INTEGER,
    "isFallback" BOOLEAN NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "environment" TEXT,
    "meta" JSONB,

    CONSTRAINT "llm_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_messages" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "metadataJson" JSONB,

    CONSTRAINT "customer_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalInvoiceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "number" TEXT,
    "dueDate" TIMESTAMP(3),
    "totalAmount" DECIMAL(18,2),
    "balance" DECIMAL(18,2),
    "status" TEXT,
    "publicUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_jobNimbusId_key" ON "jobs"("jobNimbusId");

-- CreateIndex
CREATE INDEX "jobs_jobNimbusId_idx" ON "jobs"("jobNimbusId");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_jobNimbusId_key" ON "contacts"("jobNimbusId");

-- CreateIndex
CREATE INDEX "contacts_jobId_idx" ON "contacts"("jobId");

-- CreateIndex
CREATE INDEX "job_sync_logs_jobId_idx" ON "job_sync_logs"("jobId");

-- CreateIndex
CREATE INDEX "job_sync_logs_createdAt_idx" ON "job_sync_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "photo_metadata_jobNimbusAttachmentId_key" ON "photo_metadata"("jobNimbusAttachmentId");

-- CreateIndex
CREATE INDEX "photo_metadata_jobId_idx" ON "photo_metadata"("jobId");

-- CreateIndex
CREATE INDEX "photo_metadata_qcStatus_idx" ON "photo_metadata"("qcStatus");

-- CreateIndex
CREATE INDEX "photo_metadata_category_idx" ON "photo_metadata"("category");

-- CreateIndex
CREATE INDEX "qc_results_jobId_idx" ON "qc_results"("jobId");

-- CreateIndex
CREATE INDEX "qc_results_status_idx" ON "qc_results"("status");

-- CreateIndex
CREATE INDEX "qc_photo_checks_jobId_idx" ON "qc_photo_checks"("jobId");

-- CreateIndex
CREATE INDEX "qc_photo_checks_status_idx" ON "qc_photo_checks"("status");

-- CreateIndex
CREATE INDEX "risk_flags_jobId_idx" ON "risk_flags"("jobId");

-- CreateIndex
CREATE INDEX "risk_flags_riskLevel_idx" ON "risk_flags"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "job_risk_snapshots_jobId_key" ON "job_risk_snapshots"("jobId");

-- CreateIndex
CREATE INDEX "job_risk_snapshots_riskLevel_idx" ON "job_risk_snapshots"("riskLevel");

-- CreateIndex
CREATE INDEX "job_risk_snapshots_riskComputedAt_idx" ON "job_risk_snapshots"("riskComputedAt");

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_magicLinkToken_key" ON "customer_users"("magicLinkToken");

-- CreateIndex
CREATE INDEX "customer_users_email_idx" ON "customer_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_users_jobId_email_key" ON "customer_users"("jobId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "portal_sessions_token_key" ON "portal_sessions"("token");

-- CreateIndex
CREATE INDEX "portal_sessions_token_idx" ON "portal_sessions"("token");

-- CreateIndex
CREATE INDEX "portal_sessions_jobId_idx" ON "portal_sessions"("jobId");

-- CreateIndex
CREATE INDEX "portal_sessions_customerUserId_idx" ON "portal_sessions"("customerUserId");

-- CreateIndex
CREATE INDEX "subcontractors_performanceStatus_idx" ON "subcontractors"("performanceStatus");

-- CreateIndex
CREATE INDEX "subcontractors_lastComplianceStatus_idx" ON "subcontractors"("lastComplianceStatus");

-- CreateIndex
CREATE INDEX "subcontractors_scoreTier_idx" ON "subcontractors"("scoreTier");

-- CreateIndex
CREATE INDEX "subcontractors_isActive_idx" ON "subcontractors"("isActive");

-- CreateIndex
CREATE INDEX "safety_incidents_jobId_idx" ON "safety_incidents"("jobId");

-- CreateIndex
CREATE INDEX "safety_incidents_subcontractorId_idx" ON "safety_incidents"("subcontractorId");

-- CreateIndex
CREATE INDEX "safety_incidents_severity_idx" ON "safety_incidents"("severity");

-- CreateIndex
CREATE INDEX "safety_incidents_status_idx" ON "safety_incidents"("status");

-- CreateIndex
CREATE INDEX "safety_incidents_occurredAt_idx" ON "safety_incidents"("occurredAt");

-- CreateIndex
CREATE INDEX "safety_incident_photos_incidentId_idx" ON "safety_incident_photos"("incidentId");

-- CreateIndex
CREATE INDEX "safety_checklists_jobId_idx" ON "safety_checklists"("jobId");

-- CreateIndex
CREATE INDEX "safety_checklists_subcontractorId_idx" ON "safety_checklists"("subcontractorId");

-- CreateIndex
CREATE INDEX "safety_checklists_type_idx" ON "safety_checklists"("type");

-- CreateIndex
CREATE INDEX "safety_checklists_date_idx" ON "safety_checklists"("date");

-- CreateIndex
CREATE UNIQUE INDEX "warranties_jobId_key" ON "warranties"("jobId");

-- CreateIndex
CREATE INDEX "warranties_jobId_idx" ON "warranties"("jobId");

-- CreateIndex
CREATE INDEX "warranties_status_idx" ON "warranties"("status");

-- CreateIndex
CREATE INDEX "warranties_endDate_idx" ON "warranties"("endDate");

-- CreateIndex
CREATE INDEX "warranty_claims_jobId_idx" ON "warranty_claims"("jobId");

-- CreateIndex
CREATE INDEX "warranty_claims_warrantyId_idx" ON "warranty_claims"("warrantyId");

-- CreateIndex
CREATE INDEX "warranty_claims_status_idx" ON "warranty_claims"("status");

-- CreateIndex
CREATE INDEX "material_orders_jobId_idx" ON "material_orders"("jobId");

-- CreateIndex
CREATE INDEX "material_orders_status_idx" ON "material_orders"("status");

-- CreateIndex
CREATE INDEX "material_orders_expectedDeliveryDate_idx" ON "material_orders"("expectedDeliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE INDEX "subcontractor_documents_subcontractorId_idx" ON "subcontractor_documents"("subcontractorId");

-- CreateIndex
CREATE INDEX "subcontractor_documents_type_idx" ON "subcontractor_documents"("type");

-- CreateIndex
CREATE INDEX "job_subcontractor_assignments_jobId_idx" ON "job_subcontractor_assignments"("jobId");

-- CreateIndex
CREATE INDEX "job_subcontractor_assignments_subcontractorId_idx" ON "job_subcontractor_assignments"("subcontractorId");

-- CreateIndex
CREATE INDEX "job_subcontractor_assignments_isPrimary_idx" ON "job_subcontractor_assignments"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "job_financial_snapshots_jobId_key" ON "job_financial_snapshots"("jobId");

-- CreateIndex
CREATE INDEX "job_financial_snapshots_riskLevel_idx" ON "job_financial_snapshots"("riskLevel");

-- CreateIndex
CREATE INDEX "job_financial_snapshots_marginPercent_idx" ON "job_financial_snapshots"("marginPercent");

-- CreateIndex
CREATE INDEX "job_financial_snapshots_accountingSource_idx" ON "job_financial_snapshots"("accountingSource");

-- CreateIndex
CREATE INDEX "job_financial_snapshots_arStatus_idx" ON "job_financial_snapshots"("arStatus");

-- CreateIndex
CREATE INDEX "workflow_action_logs_jobId_ruleKey_createdAt_idx" ON "workflow_action_logs"("jobId", "ruleKey", "createdAt");

-- CreateIndex
CREATE INDEX "llm_call_logs_createdAt_idx" ON "llm_call_logs"("createdAt");

-- CreateIndex
CREATE INDEX "llm_call_logs_feature_idx" ON "llm_call_logs"("feature");

-- CreateIndex
CREATE INDEX "llm_call_logs_model_idx" ON "llm_call_logs"("model");

-- CreateIndex
CREATE INDEX "customer_messages_jobId_createdAt_idx" ON "customer_messages"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_messages_type_idx" ON "customer_messages"("type");

-- CreateIndex
CREATE UNIQUE INDEX "payments_externalId_key" ON "payments"("externalId");

-- CreateIndex
CREATE INDEX "payments_jobId_idx" ON "payments"("jobId");

-- CreateIndex
CREATE INDEX "payments_receivedAt_idx" ON "payments"("receivedAt");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_externalId_key" ON "invoices"("externalId");

-- CreateIndex
CREATE INDEX "invoices_jobId_idx" ON "invoices"("jobId");

-- CreateIndex
CREATE INDEX "invoices_externalId_idx" ON "invoices"("externalId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_sync_logs" ADD CONSTRAINT "job_sync_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_metadata" ADD CONSTRAINT "photo_metadata_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_results" ADD CONSTRAINT "qc_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_results" ADD CONSTRAINT "qc_results_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "photo_metadata"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qc_photo_checks" ADD CONSTRAINT "qc_photo_checks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_flags" ADD CONSTRAINT "risk_flags_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_risk_snapshots" ADD CONSTRAINT "job_risk_snapshots_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_users" ADD CONSTRAINT "customer_users_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "customer_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incidents" ADD CONSTRAINT "safety_incidents_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_incident_photos" ADD CONSTRAINT "safety_incident_photos_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "safety_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_checklists" ADD CONSTRAINT "safety_checklists_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety_checklists" ADD CONSTRAINT "safety_checklists_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "warranties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_orders" ADD CONSTRAINT "material_orders_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcontractor_documents" ADD CONSTRAINT "subcontractor_documents_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_subcontractor_assignments" ADD CONSTRAINT "job_subcontractor_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_subcontractor_assignments" ADD CONSTRAINT "job_subcontractor_assignments_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_financial_snapshots" ADD CONSTRAINT "job_financial_snapshots_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_financial_snapshots" ADD CONSTRAINT "job_financial_snapshots_primaryInvoiceId_fkey" FOREIGN KEY ("primaryInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_messages" ADD CONSTRAINT "customer_messages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
